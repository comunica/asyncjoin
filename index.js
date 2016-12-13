
let IntegerIterator = require('asynciterator').IntegerIterator;

// let MergeStream = require('./util/MergeStream');
//
// let stream = new MergeStream(new IntegerIterator({ start: 0, end: 10 }), new IntegerIterator({ start: 100, end: 110 }));
// stream.on('data', console.log);
// stream.on('end', () => console.log('END'));

// let NestedLoopJoin = require('./join/NestedLoopJoin');
// let stream = new NestedLoopJoin(
//     new IntegerIterator({ start: 0, end: 2 }),
//     new IntegerIterator({ start: 100, end: 104 }),
//     (l, r) => { return (l % 2 ) === (r % 2) ? {left: l, right:r} : null }
// );
//
// stream.on('data', console.log);
// stream.on('end', () => console.log('END'));

// let SymmetricHashJoin = require('./join/SymmetricHashJoin');
// let stream = new SymmetricHashJoin(
//     new IntegerIterator({ start: 0, end: 2 }),
//     new IntegerIterator({ start: 100, end: 104 }),
//     (item) => "HASH",
//     (l, r) => { return (l % 2 ) === (r % 2) ? {left: l, right:r} : null }
// );
//
// stream.on('data', console.log);
// stream.on('end', () => console.log('END'));

let HashJoin = require('./join/HashJoin');
let stream = new HashJoin(
    new IntegerIterator({ start: 0, end: 2 }),
    new IntegerIterator({ start: 100, end: 104 }),
    (item) => "HASH",
    (l, r) => { return (l % 2 ) === (r % 2) ? {left: l, right:r} : null }
);

stream.on('data', console.log);
stream.on('end', () => console.log('END'));