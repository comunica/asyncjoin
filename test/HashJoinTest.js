
const genericTest = require('./genericTest');
const HashJoin = require('../join/HashJoin');

describe('HashJoin', () =>
{
    genericTest.testStream((left, right, funJoin) => new HashJoin(left, right, a => 1, funJoin));
});

const assert = require('assert');
const { ArrayIterator, EmptyIterator } = require('asynciterator');

function countingIterator (items)
{
    const iterator = new ArrayIterator(items, { autoStart: false });
    const read = iterator.read.bind(iterator);
    iterator.reads = 0;
    iterator.read = () => { iterator.reads++; return read(); };
    return iterator;
}

describe('HashJoin that is not read', () =>
{
    it('does not read its inputs', done =>
    {
        const left = countingIterator([ 1, 2 ]);
        const right = countingIterator([ 3 ]);
        new HashJoin(left, right, a => 1, (a, b) => ({ a, b }));
        setImmediate(() =>
        {
            assert.strictEqual(left.reads, 0, 'the left stream was read');
            assert.strictEqual(right.reads, 0, 'the right stream was read');
            done();
        });
    });

    it('does not read its inputs when destroyed', done =>
    {
        const left = countingIterator([ 1, 2 ]);
        const right = countingIterator([ 3 ]);
        new HashJoin(left, right, a => 1, (a, b) => ({ a, b })).destroy();
        setImmediate(() =>
        {
            assert.strictEqual(left.reads, 0, 'the left stream was read');
            assert.strictEqual(right.reads, 0, 'the right stream was read');
            assert.ok(left.destroyed && right.destroyed, 'the inputs were not destroyed');
            done();
        });
    });
});

describe('HashJoin with a consumer that reads on readable events', () =>
{
    it('emits all results', done =>
    {
        const stream = new HashJoin(
            new ArrayIterator([ 'a', 'b' ], { autoStart: false }),
            new ArrayIterator([ 'r' ], { autoStart: false }),
            () => 1,
            (left, right) => `${left}-${right}`,
        );
        const results = [];
        stream.on('readable', () =>
        {
            let item;
            while ((item = stream.read()) !== null)
                results.push(item);
        });
        stream.on('end', () =>
        {
            assert.deepStrictEqual(results, [ 'a-r', 'b-r' ]);
            done();
        });
    });
});

describe('HashJoin with an empty hash table', () =>
{
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

describe('HashJoin with uint32 hashes', () =>
{
    it('joins items with equal hashes in insertion order', done =>
    {
        const hashes = { a: 0xFFFFFFFF, b: 1, c: 0xFFFFFFFF, d: 0x80000000 };
        const results = [];
        const stream = new HashJoin(
            new ArrayIterator([ 'a', 'b', 'c', 'd' ], { autoStart: false }),
            new ArrayIterator([ 'c', 'd', 'b' ], { autoStart: false }),
            item => hashes[item],
            (left, right) => `${left}-${right}`,
        );
        stream.on('data', data => results.push(data));
        stream.on('end', () =>
        {
            assert.deepStrictEqual(results, [ 'a-c', 'c-c', 'd-d', 'b-b' ]);
            done();
        });
    });
});

describe('HashJoin with a consumer that reads one item at a time', () =>
{
    it('emits all matches of the last right item after the right stream ended', done =>
    {
        const stream = new HashJoin(new ArrayIterator([ 'a', 'b' ]), new ArrayIterator([ 'r' ]), () => 1, (left, right) => `${left}-${right}`);
        const results = [];
        // Reading asynchronously lets the right stream end while 'b' is still pending
        stream.on('readable', function readNext ()
        {
            const item = stream.read();
            if (item !== null)
            {
                results.push(item);
                setImmediate(readNext);
            }
        });
        stream.on('end', () =>
        {
            assert.deepStrictEqual(results, [ 'a-r', 'b-r' ]);
            done();
        });
    });
});
