
let MergeStream = require('./util/MergeStream');
let IntegerIterator = require('asynciterator').IntegerIterator;

let stream = new MergeStream(new IntegerIterator({ start: 0, end: 10 }), new IntegerIterator({ start: 100, end: 110 }));
stream.on('data', console.log);
stream.on('end', () => console.log('END'));