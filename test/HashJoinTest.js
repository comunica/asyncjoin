
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

describe('HashJoin with different kinds of hashes', () =>
{
    function join (leftItems, rightItems, funHash)
    {
        return new Promise((resolve, reject) =>
        {
            const results = [];
            const stream = new HashJoin(
                new ArrayIterator(leftItems, { autoStart: false }),
                new ArrayIterator(rightItems, { autoStart: false }),
                funHash,
                (left, right) => `${left}-${right}`,
            );
            stream.on('data', data => results.push(data));
            stream.on('error', reject);
            stream.on('end', () => resolve(results));
        });
    }

    // Only joins on equal hashes, since the join function accepts every pair
    async function check (hashes)
    {
        const items = hashes.map((hash, i) => i);
        const results = await join(items, items, i => hashes[i]);
        const expected = [];
        for (const right of items)
            for (const left of items)
                if (Object.is(hashes[left], hashes[right]) || hashes[left] === hashes[right])
                    expected.push(`${left}-${right}`);
        assert.deepStrictEqual(results, expected);
    }

    it('handles many distinct small integer hashes', () => check([ ...Array(1000).keys() ]));
    it('handles duplicate hashes in insertion order', () => check([ 1, 2, 1, 3, 1, 2 ]));
    it('handles uint32 hashes', () => check([ 0, 1, 0x80000000, 0xFFFFFFFF, 0x7FFFFFFF, 0xFFFFFFFF ]));
    it('handles negative int32 hashes', () => check([ 0, -1, -0x80000000, 0x7FFFFFFF, -1 ]));
    it('distinguishes negative hashes from uint32 hashes with the same bits', () => check([ -1, 0xFFFFFFFF, 1, -1, 0xFFFFFFFF ]));
    it('distinguishes uint32 hashes from negative hashes with the same bits', () => check([ 0xFFFFFFFF, -1, 1, 0xFFFFFFFF, -1 ]));
    it('handles non-integer hashes', () => check([ 1, 1.5, 2 ** 40, 1, 1.5, 2 ** 40 ]));
    it('handles string hashes', () => check([ 'a', 'b', 'a', 'c' ]));
    it('handles mixed hashes after the table grew', () => check([ ...Array(100).keys(), 'a', ...Array(100).keys(), 'a' ]));

    it('does not join right items with hashes that are not in the table', async () =>
    {
        const left = [ 0, 1 ];
        const leftHashes = [ -1, 5 ];
        const results = await join(left, [ 'x', 'y', 'z' ], item => typeof item === 'number' ? leftHashes[item] : { x: 0xFFFFFFFF, y: 'a', z: 5 }[item]);
        assert.deepStrictEqual(results, [ '1-z' ]);
    });
});
