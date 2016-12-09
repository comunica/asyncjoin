
let IntegerIterator = require('asynciterator').IntegerIterator;

// let MergeStream = require('./util/MergeStream');
//
// let stream = new MergeStream(new IntegerIterator({ start: 0, end: 10 }), new IntegerIterator({ start: 100, end: 110 }));
// stream.on('data', console.log);
// stream.on('end', () => console.log('END'));

let NestedLoopJoin = require('./join/NestedLoopJoin');
let stream = new NestedLoopJoin(
    new IntegerIterator({ start: 0, end: 2 }),
    new IntegerIterator({ start: 100, end: 102 }),
    (l, r) => { return {left: l, right:r} }
);

stream.on('data', console.log);
stream.on('end', () => console.log('END'));