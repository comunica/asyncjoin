
let AsyncIterator = require('asynciterator').AsyncIterator;
let HashTable = require('../util/HashTable');

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

        this.leftTable = new HashTable();
        this.leftEnded = false;
        this.rightUnused = false;

        this.match    = null;
        this.matchIdx = -1;

        this.left.on('error', (error) => this.destroy(error));
        this.right.on('error', (error) => this.destroy(error));

        // The left stream is only read once this iterator is read, so that a join that is never read,
        // such as one that is destroyed before being consumed, does not consume its inputs.
        // Being readable until then makes consumers call read.
        this.readable = true;

        this.left.on('end', allowJoining.bind(this));

        function allowJoining ()
        {
            this.leftEnded = true;
            this.readable = true;

            // An inner join over an empty hash table produces nothing, so the right stream never has to be read.
            // Reading it is cheap for an in-memory iterator, but not for one backed by a remote source.
            // The iterator is ended from `read` rather than here, because `_end` notifies the listeners that
            // are attached at that moment and then drops them, and a consumer may not have attached any yet.
            if (this.leftTable.size === 0)
            {
                this.rightUnused = true;
                return;
            }

            this.right.on('readable', () => this.readable = true);
            this.right.on('end', () => { if (!this.hasResults()) this._end(); });
        }
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
        // Results only follow once the whole left stream is in the hash table
        if (!this.leftEnded)
        {
            this._addDataListenerIfNeeded();
            this.readable = false;
            return null;
        }

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
                let item = this.leftTable.get(this.matchIdx);
                this.matchIdx = this.leftTable.next(this.matchIdx);
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

            this.matchIdx = this.leftTable.first(this.funHash(this.match));
        }
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
        this.left.on('data', addItem.bind(this));

        function addItem(item)
        {
            this.leftTable.add(this.funHash(item), item);
        }
    }
}

module.exports = HashJoin;
