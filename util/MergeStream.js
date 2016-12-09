
let AsyncIterator = require('asynciterator');

class MergeStream extends AsyncIterator
{
    constructor (streams)
    {
        super();
        
        if (!Array.isArray(streams))
            streams = Array.prototype.slice.call(arguments);
        
        this.streams = streams;
        
        for (let stream of streams)
        {
            stream.on('readable', () => this.emit('readable'));
            stream.on('end', () => {if (this.ended) this.emit('end')});
        }
        
        if (this.streams.length === 0)
            this.close();
    }
    
    get readable() { return this.streams.some (stream => stream.readable); }
    get closed()   { return this.streams.every(stream => stream.closed);   }
    get ended()    { return this.streams.every(stream => stream.ended);    }
    
    close ()
    {
        for (let stream of this.streams)
            stream.close();
    }
    
    read ()
    {
        for (let i = this.streams.length-1; i >= 0; --i)
        {
            let item = this.streams[i].read();
            if (item !== null)
                return item;
            
            // clean up array of streams
            if (this.streams[i].ended)
                this.streams.splice(i, 1);
        }
        
        return null;
    }
}

module.exports = MergeStream;