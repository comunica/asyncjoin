
const genericTest = require('./genericTest');
const HashJoin = require('../join/HashJoin');

describe('HashJoin', () =>
{
    genericTest.testStream((left, right, funJoin) => new HashJoin(left, right, a => 1, funJoin));
});

const assert = require('assert');
const { ArrayIterator, EmptyIterator } = require('asynciterator');

describe('HashJoin with an empty hash table', () =>
{
    function countingIterator (items)
    {
        const iterator = new ArrayIterator(items, { autoStart: false });
        const read = iterator.read.bind(iterator);
        iterator.reads = 0;
        iterator.read = () => { iterator.reads++; return read(); };
        return iterator;
    }

    it('does not read the right stream', done =>
    {
        const right = countingIterator([ 1, 2, 3 ]);
        const stream = new HashJoin(new EmptyIterator(), right, a => 1, (a, b) => ({ a, b }));
        stream.on('data', () => assert.fail('expected no results'));
        stream.on('end', () =>
        {
            assert.strictEqual(right.reads, 0, 'the right stream was read');
            done();
        });
    });

    it('ends for a listener that is attached after the left stream ended', done =>
    {
        const right = countingIterator([ 1, 2, 3 ]);
        const stream = new HashJoin(new ArrayIterator([], { autoStart: false }), right, a => 1, (a, b) => ({ a, b }));
        // The left stream ends before anything listens, so `end` must still reach this listener
        setImmediate(() =>
        {
            stream.on('data', () => assert.fail('expected no results'));
            stream.on('end', () =>
            {
                assert.strictEqual(right.reads, 0, 'the right stream was read');
                done();
            });
        });
    });

    it('still reads the right stream when the join function filters everything out', done =>
    {
        const right = countingIterator([ 3 ]);
        const stream = new HashJoin(new ArrayIterator([ 1, 2 ], { autoStart: false }), right, a => 1, () => null);
        stream.on('data', () => assert.fail('expected no results'));
        stream.on('end', () =>
        {
            assert.ok(right.reads > 0, 'the right stream was not read');
            done();
        });
    });
});
