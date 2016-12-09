
let AsyncIterator = require('asynciterator');

class SymmetricHashJoin extends AsyncIterator
{
    constructor (left, right, funHash, funJoin)
    {
        super();
        
        this.left = left;
        this.right = right;
        this.useLeft = true;
        
        this.funHash = funHash;
        this.funJoin = funJoin;
        
        this.leftMap = new Map();
        this.rightMap = new Map();
        
        this.on('end', () =>
        {
            this.leftMap = null;
            this.rightMap = null;
        });
        
        this.match = null;
        this.matches = [];
        this.matchIdx = 0;
        
        this.left.on ('readable', () => { if (this.useLeft)  this.emit('readable'); });
        this.right.on('readable', () => { if (!this.useLeft) this.emit('readable'); });
        
        this.left.on('end', () => { if (this.ended) this.emit('end'); });
        this.right.on('end', () => { if (this.ended) this.emit('end'); });
    }
    
    get readable() { return this.matchIdx < this.matches.length || (this.useLeft && this.left.readable) || (!this.useLeft && this.right.readable) }
    get closed()   { return this.left.closed && this.right.closed }
    get ended()    { return this.left.ended  && this.right.ended && this.matchIdx >= this.matches.length; }
    
    close ()
    {
        this.left.close();
        this.right.close();
    }
    
    read ()
    {
        if (this.ended)
        {
            this.emit('end');
            return null;
        }
        
        while (this.matchIdx < this.matches.length)
        {
            let item = this.matches[this.matchIdx++];
            // useLeft reversed since it changed after getting a list of matches
            let result = this.useLeft ? this.funJoin(item, this.match) : this.funJoin(this.match, item);
            if (result !== null)
                return result;
        }
        
        let item = this.useLeft ? this.left.read() : this.right.read();
        if (item === null)
            return null;
        
        let hash = this.funHash(item);
        let map = this.useLeft ? this.leftMap : this.rightMap;
        if (!map.has(hash))
            map.set(hash, []);
        let arr = map.get(hash);
        arr.push(item);
    
        this.match = item;
        this.matches = (this.useLeft ? this.rightMap : this.leftMap).get(this.funHash(item)) || [];
        this.matchIdx = 0;
        
        this.useLeft = !this.useLeft;
        
        this.emit('readable');
        
        return null;
    }
}

module.exports = SymmetricHashJoin;