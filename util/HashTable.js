const INITIAL_CAPACITY = 16;

// Multimap from hashes to items, iterated per hash in insertion order through item indexes.
// Hashes are compared as int32 (`hash | 0`), so uint32 hashes keep their identity, but other numbers may collide.
// Items are stored in insertion order, items with the same hash are chained through `nexts`,
// and `tails` holds the last item of each chain, indexed by the chain's first item.
// Chains are found through an open-addressing table of hash keys (`slotKeys`) and first items (`slotHeads`).
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
        return this.slotHeads[this._findSlot(hash | 0)] - 1;
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

        let key = hash | 0;
        let slot = this._findSlot(key);
        let head = this.slotHeads[slot] - 1;
        if (head < 0)
        {
            this.slotKeys[slot] = key;
            this.slotHeads[slot] = idx + 1;
            if (++this.slotCount * 2 > this.slotKeys.length)
                this._growSlots();
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
}

module.exports = HashTable;
