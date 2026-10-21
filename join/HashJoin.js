let AsyncIterator = require('asynciterator').AsyncIterator;

const INITIAL_CAPACITY = 16;

// https://en.wikipedia.org/wiki/Hash_join
class HashJoin extends AsyncIterator
{
    constructor (left, right, funHash, funJoin)
    {
        super();

        this.addedDataListener = false;
        this.left = left;
        this.right = right;
        this.funHash = funHash;
        this.funJoin = funJoin;

        // Left items are stored in insertion order, items with the same hash are chained through `next`,
        // and `tails` holds the last item of each chain, indexed by the chain's first item.
        // Integer hashes go in an open-addressing table of typed arrays (`slotKeys`, `slotHeads`),
        // other hashes fall back to `leftMap`, which maps a hash to the index of its first item.
        this.items = [];
        this.next = new Int32Array(INITIAL_CAPACITY);
        this.tails = new Int32Array(INITIAL_CAPACITY);
        this.slotKeys = new Int32Array(INITIAL_CAPACITY);
        this.slotHeads = new Int32Array(INITIAL_CAPACITY); // Item index + 1, so 0 marks an empty slot
        this.slotCount = 0;
        // 0 if all hashes so far are in [0, 2^31), -1 if negative int32 hashes were seen, 1 if uint32 hashes >= 2^31 were seen
        this.signedness = 0;
        this.leftMap = null;

        this.rightUnused = false;

        this.match    = null;
        this.matchIdx = -1;

        this.left.on('error', (error) => this.destroy(error));
        this.right.on('error', (error) => this.destroy(error));

        this.readable = false;

        this.left.on('end', allowJoining.bind(this));

        function allowJoining ()
        {
            this.readable = true;

            // An inner join over an empty hash table produces nothing, so the right stream never has to be read.
            // Reading it is cheap for an in-memory iterator, but not for one backed by a remote source.
            // The iterator is ended from `read` rather than here, because `_end` notifies the listeners that
            // are attached at that moment and then drops them, and a consumer may not have attached any yet.
            if (this.items.length === 0)
            {
                this.rightUnused = true;
                return;
            }

            this.right.on('readable', () => this.readable = true);
            this.right.on('end', () => { if (!this.hasResults()) this._end(); });
        }

        this.on('newListener', (eventName) =>
        {
            if (eventName === 'data')
            {
                this._addDataListenerIfNeeded();
            }
        });
        if (this.left.readable)
            this._addDataListenerIfNeeded();
        this.left.on('readable', () => this._addDataListenerIfNeeded());
    }

    hasResults ()
    {
        return !this.right.ended || this.matchIdx >= 0;
    }

    _end ()
    {
        super._end();
        this.left.destroy();
        this.right.destroy();
    }

    read ()
    {
        this._addDataListenerIfNeeded();

        while(true) {
            if (this.ended || !this.readable)
                return null;

            if (this.rightUnused)
            {
                this._end();
                return null;
            }

            while (this.matchIdx >= 0)
            {
                let item = this.items[this.matchIdx];
                this.matchIdx = this.next[this.matchIdx];
                let result = this.funJoin(item, this.match);
                if (result !== null)
                    return result;
            }

            if (!this.hasResults())
                this._end();

            this.match = this.right.read();

            if (this.match === null)
            {
                this.readable = false;
                return null;
            }

            this.matchIdx = this._getHead(this.funHash(this.match));
        }
    }

    // Returns the int32 key for an integer hash in [-2^31, 2^32) that matches the signedness seen so far, or null otherwise
    _toKey (hash)
    {
        let key = hash | 0;
        if (key === hash)
            return key >= 0 || this.signedness <= 0 ? key : null;
        if (hash >>> 0 === hash)
            return this.signedness >= 0 ? key : null;
        return null;
    }

    // Returns the slot of the given key, or the empty slot where it should be inserted
    _findSlot (key)
    {
        let mask = this.slotKeys.length - 1;
        // Mix the bits, since sequential integers would otherwise cluster
        let slot = Math.imul(key, 0x9E3779B1) & mask;
        while (this.slotHeads[slot] !== 0 && this.slotKeys[slot] !== key)
            slot = (slot + 1) & mask;
        return slot;
    }

    _getHead (hash)
    {
        if (this.leftMap !== null)
        {
            let head = this.leftMap.get(hash);
            return head === undefined ? -1 : head;
        }
        let key = this._toKey(hash);
        if (key === null)
            return -1;
        return this.slotHeads[this._findSlot(key)] - 1;
    }

    _addItem (item)
    {
        let hash = this.funHash(item);
        let idx = this.items.length;
        this.items.push(item);
        if (idx === this.next.length)
        {
            this.next = HashJoin._grow(this.next);
            this.tails = HashJoin._grow(this.tails);
        }
        this.next[idx] = -1;

        let head = -1;
        if (this.leftMap === null)
        {
            let key = this._toKey(hash);
            if (key === null)
                this._convertToMap();
            else
            {
                if (key < 0)
                    this.signedness = hash < 0 ? -1 : 1;
                let slot = this._findSlot(key);
                head = this.slotHeads[slot] - 1;
                if (head < 0)
                {
                    this.slotKeys[slot] = key;
                    this.slotHeads[slot] = idx + 1;
                    if (++this.slotCount * 2 > this.slotKeys.length)
                        this._growSlots();
                }
            }
        }
        if (this.leftMap !== null)
        {
            let mapHead = this.leftMap.get(hash);
            head = mapHead === undefined ? -1 : mapHead;
            if (head < 0)
                this.leftMap.set(hash, idx);
        }

        // Append to the end of the chain to keep insertion order
        if (head < 0)
            this.tails[idx] = idx;
        else
        {
            this.next[this.tails[head]] = idx;
            this.tails[head] = idx;
        }
    }

    static _grow (array)
    {
        let grown = new Int32Array(array.length * 2);
        grown.set(array);
        return grown;
    }

    _growSlots ()
    {
        let oldKeys = this.slotKeys;
        let oldHeads = this.slotHeads;
        this.slotKeys = new Int32Array(oldKeys.length * 2);
        this.slotHeads = new Int32Array(oldKeys.length * 2);
        for (let i = 0; i < oldKeys.length; i++)
        {
            if (oldHeads[i] !== 0)
            {
                let slot = this._findSlot(oldKeys[i]);
                this.slotKeys[slot] = oldKeys[i];
                this.slotHeads[slot] = oldHeads[i];
            }
        }
    }

    // Moves all chains to `leftMap`, for when a hash can not be stored as an int32 key
    _convertToMap ()
    {
        this.leftMap = new Map();
        for (let i = 0; i < this.slotKeys.length; i++)
        {
            if (this.slotHeads[i] !== 0)
            {
                let key = this.slotKeys[i];
                this.leftMap.set(this.signedness > 0 ? key >>> 0 : key, this.slotHeads[i] - 1);
            }
        }
        this.slotKeys = null;
        this.slotHeads = null;
    }

    _addDataListenerIfNeeded() {
        if (!this.addedDataListener)
        {
            this.addedDataListener = true;
            this._addDataListener();
        }
    }

    _addDataListener()
    {
        this.left.on('data', item => this._addItem(item));
    }
}

module.exports = HashJoin;
