const INITIAL_CAPACITY = 16;

// Multimap from hashes to items, iterated per hash in insertion order through item indexes.
// Items are stored in insertion order, items with the same hash are chained through `nexts`,
// and `tails` holds the last item of each chain, indexed by the chain's first item.
// Integer hashes go in an open-addressing table of typed arrays (`slotKeys`, `slotHeads`),
// other hashes fall back to `map`, which maps a hash to the index of its first item.
class HashTable
{
    constructor ()
    {
        this.items = [];
        this.nexts = new Int32Array(INITIAL_CAPACITY);
        this.tails = new Int32Array(INITIAL_CAPACITY);
        this.slotKeys = new Int32Array(INITIAL_CAPACITY);
        this.slotHeads = new Int32Array(INITIAL_CAPACITY); // Item index + 1, so 0 marks an empty slot
        this.slotCount = 0;
        // 0 if all hashes so far are in [0, 2^31), -1 if negative int32 hashes were seen, 1 if uint32 hashes >= 2^31 were seen
        this.signedness = 0;
        this.map = null;
    }

    get size ()
    {
        return this.items.length;
    }

    get (idx)
    {
        return this.items[idx];
    }

    // Returns the index of the first item with the given hash, or -1 if there is none
    first (hash)
    {
        if (this.map !== null)
        {
            let head = this.map.get(hash);
            return head === undefined ? -1 : head;
        }
        let key = this._toKey(hash);
        if (key === null)
            return -1;
        return this.slotHeads[this._findSlot(key)] - 1;
    }

    // Returns the index of the next item with the same hash, or -1 if there is none
    next (idx)
    {
        return this.nexts[idx];
    }

    add (hash, item)
    {
        let idx = this.items.length;
        this.items.push(item);
        if (idx === this.nexts.length)
        {
            this.nexts = HashTable._grow(this.nexts);
            this.tails = HashTable._grow(this.tails);
        }
        this.nexts[idx] = -1;

        let head = -1;
        if (this.map === null)
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
        if (this.map !== null)
        {
            let mapHead = this.map.get(hash);
            head = mapHead === undefined ? -1 : mapHead;
            if (head < 0)
                this.map.set(hash, idx);
        }

        // Append to the end of the chain to keep insertion order
        if (head < 0)
            this.tails[idx] = idx;
        else
        {
            this.nexts[this.tails[head]] = idx;
            this.tails[head] = idx;
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

    // Moves all chains to `map`, for when a hash can not be stored as an int32 key
    _convertToMap ()
    {
        this.map = new Map();
        for (let i = 0; i < this.slotKeys.length; i++)
        {
            if (this.slotHeads[i] !== 0)
            {
                let key = this.slotKeys[i];
                this.map.set(this.signedness > 0 ? key >>> 0 : key, this.slotHeads[i] - 1);
            }
        }
        this.slotKeys = null;
        this.slotHeads = null;
    }
}

module.exports = HashTable;
