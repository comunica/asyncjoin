const assert = require('assert');
const HashTable = require('../util/HashTable');

describe('HashTable', () =>
{
    function lookup (table, hash)
    {
        const items = [];
        for (let idx = table.first(hash); idx >= 0; idx = table.next(idx))
            items.push(table.get(idx));
        return items;
    }

    // Adds the index of each hash as item, and checks that every lookup returns the indexes of exactly equal hashes
    function check (hashes, probes = [])
    {
        const table = new HashTable();
        hashes.forEach((hash, i) => table.add(hash, i));
        assert.strictEqual(table.size, hashes.length);
        for (const hash of [ ...hashes, ...probes ])
        {
            const expected = [];
            hashes.forEach((other, i) => { if (other === hash) expected.push(i); });
            assert.deepStrictEqual(lookup(table, hash), expected, `for hash ${String(hash)}`);
        }
    }

    it('is empty initially', () =>
    {
        const table = new HashTable();
        assert.strictEqual(table.size, 0);
        assert.strictEqual(table.first(1), -1);
    });

    it('handles many distinct small integer hashes', () => check([ ...Array(1000).keys() ], [ 1000, -1 ]));
    it('handles duplicate hashes in insertion order', () => check([ 1, 2, 1, 3, 1, 2 ], [ 4 ]));
    it('handles uint32 hashes', () => check([ 0, 1, 0x80000000, 0xFFFFFFFF, 0x7FFFFFFF, 0xFFFFFFFF ], [ -1, -0x80000000 ]));
    it('handles negative int32 hashes', () => check([ 0, -1, -0x80000000, 0x7FFFFFFF, -1 ], [ 0xFFFFFFFF, 0x80000000 ]));
    it('distinguishes negative hashes from uint32 hashes with the same bits', () => check([ -1, 0xFFFFFFFF, 1, -1, 0xFFFFFFFF ]));
    it('distinguishes uint32 hashes from negative hashes with the same bits', () => check([ 0xFFFFFFFF, -1, 1, 0xFFFFFFFF, -1 ]));
    it('handles non-integer hashes', () => check([ 1, 1.5, 2 ** 40, 1, 1.5, 2 ** 40 ], [ 2, 2 ** 32 + 1 ]));
    it('handles string hashes', () => check([ 'a', 'b', 'a', 'c' ], [ 'd', 1 ]));
    it('handles mixed hashes after the table grew', () => check([ ...Array(100).keys(), 'a', ...Array(100).keys(), 'a' ], [ 100 ]));
});
