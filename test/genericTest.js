
const _ = require('lodash');
const assert = require('assert');
const AsyncIterator = require('asynciterator');
const IntegerIterator = AsyncIterator.IntegerIterator;

function checkIntegerStreams (leftOptions, rightOptions, funJoin, joinType, streamFunc, done)
{
    let leftStream = new IntegerIterator(leftOptions);
    let rightStream = new IntegerIterator(rightOptions);
    let stream = streamFunc(leftStream, rightStream, funJoin, joinType);
    let expected = [];
    for (let i = leftOptions.start; i <= leftOptions.end; ++i)
    {
        let found = false;
        for (let j = rightOptions.start; j <= rightOptions.end; ++j)
        {
            if (funJoin(i, j))
            {
                expected.push(funJoin(i, j));
                found = true;
            }
        }
        if (!found && joinType.left)
            expected.push(i);
    }
    expected = new Set(expected);
    let result = [];
    stream.on('data', data =>
    {
        result.push(data);
    });
    stream.on('end', () =>
    {
        assert.deepEqual(new Set(result), expected);
        done();
    })
}

// streamFunc should take a left stream, right stream and join function as input and return a stream object
function testStream (streamFunc)
{
    it('merges 2 streams of length 3', done =>
    {
        let leftOptions = {start: 0, end: 2};
        let rightOptions = {start: 3, end: 5};
        let funJoin = (left, right) => { return { left, right } };
        checkIntegerStreams(leftOptions, rightOptions, funJoin, {}, streamFunc, done)
    });

    it('merges 2 streams of length 100', done =>
    {
        let leftOptions = {start: 0, end: 99};
        let rightOptions = {start: 3, end: 102};
        let funJoin = (left, right) => { return left === right ? { left, right } : null };
        checkIntegerStreams(leftOptions, rightOptions, funJoin, {}, streamFunc, done)
    });
    
    it('merges an empty stream with a stream of length 3', done =>
    {
        let leftOptions = {start: 0, end: -1};
        let rightOptions = {start: 3, end: 5};
        let funJoin = (left, right) => { return { left, right } };
        checkIntegerStreams(leftOptions, rightOptions, funJoin, {}, streamFunc, done)
    });
    
    it('merges a stream of length 3 with an empty stream', done =>
    {
        let leftOptions = {start: 0, end: 2};
        let rightOptions = {start: 3, end: 2};
        let funJoin = (left, right) => { return { left, right } };
        checkIntegerStreams(leftOptions, rightOptions, funJoin, {}, streamFunc, done)
    });
    
    it('merges 2 empty streams', done =>
    {
        let leftOptions = {start: 0, end: -1};
        let rightOptions = {start: 3, end: 2};
        let funJoin = (left, right) => { return { left, right } };
        checkIntegerStreams(leftOptions, rightOptions, funJoin, {}, streamFunc, done)
    });
    
    it('supports join functions returning null', done =>
    {
        let leftOptions = {start: 0, end: 2};
        let rightOptions = {start: 3, end: 5};
        let funJoin = (left, right) => { return ((left % 2) === (right % 2)) ? { left, right } : null };
        checkIntegerStreams(leftOptions, rightOptions, funJoin, {}, streamFunc, done)
    });

    it('supports left joins', done =>
    {
        let leftOptions = {start: 0, end: 2};
        let rightOptions = {start: 2, end: 4};
        let funJoin = (left, right) => { return ((left % 2) === 0 && (right % 2) === 0) ? { left, right } : null };
        checkIntegerStreams(leftOptions, rightOptions, funJoin, { left: true }, streamFunc, done)
    });
}

module.exports = {
    testStream: testStream
};