
let AsyncIterator = require('asynciterator');

// https://en.wikipedia.org/wiki/Hash_join
class HashJoin extends AsyncIterator
{
    constructor (left, right, funHash, funJoin, joinType)
    {
        super();
        
        this.left = left;
        this.right = right;
        this.funHash = funHash;
        this.funJoin = funJoin;
        this.joinType = joinType || { left: false, right: false };
        
        this.leftMap = new Map();
    
        this.match    = null;
        this.matches  = [];
        this.matchIdx = 0;
        
        
        this.readable = false;
        
        this.left.on('end', allowJoining.bind(this));
        this.left.on('data', addItem.bind(this));
        
        function addItem (item)
        {
            let hash = this.funHash(item);
            if (!this.leftMap.has(hash))
                this.leftMap.set(hash, []);
            let arr = this.leftMap.get(hash);
            // don't do extended object if there is no left join to avoid additional memory consumption
            arr.push(this.joinType.left ? { item, joined: false} : item);
        }
        function allowJoining ()
        {
            if (this.leftMap.size <= 0)
                return this.close();
            this.readable = true;
            this.right.on('readable', () => this.readable = true);
            this.right.on('end', () => { if (!this.hasResults()) this.leftJoinOrEnd(); });
        }
    }
    
    hasResults ()
    {
        return !this.right.ended || this.matchIdx < this.matches.length;
    }
    
    close ()
    {
        super.close();
        this.left.close();
        this.right.close();
    }

    leftJoinOrEnd ()
    {
        // either the end event of the right string fired late (after all results were already returned)
        // or we just returned the last result

        if (this.joinType.left && this.leftMap)
        {
            this.matchIdx = 0;
            this.matches = [];
            // find all unmatched left elements
            for (let arr of this.leftMap.values())
                this.matches.push(...arr.filter(e => !e.joined));

            if (this.matches.length > 0)
            {
                // remove leftMap so this can only be done once
                this.leftMap = null;
                this.readable = true;
                return true;
            }
        }
        this._end();
        return false;
    }
    
    read ()
    {
        if (this.ended || !this.readable)
            return null;

        while (this.matchIdx < this.matches.length)
        {
            let item = this.matches[this.matchIdx++];
            // we are in cleanup mode and doing a left join
            if (!this.leftMap && this.joinType.left)
                return item.item;

            let result = this.funJoin(this.joinType.left ? item.item : item, this.match);
            if (result !== null)
            {
                if (this.joinType.left)
                    item.joined = true;
                return result;
            }
        }

        // right join
        if (this.matches.length === 0 && this.joinType.right && this.match)
        {
            let right = this.match;
            this.match = null; // remove match so this can only trigger once
            return right;
        }
    
        if (!this.hasResults())
            if (this.leftJoinOrEnd())
                return this.read(); // not finished yet
    
        this.match = this.right.read();
    
        if (this.match === null)
        {
            this.readable = false;
            return null;
        }
    
        let hash = this.funHash(this.match);
        this.matches = this.leftMap.get(hash) || [];
        this.matchIdx = 0;
    
        // array is filled again so recursive call can have results
        return this.read();
    }
}

module.exports = HashJoin;