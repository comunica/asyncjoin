
const _ = require('lodash');
const assert = require('assert');
const AsyncIterator = require('asynciterator');
const EmptyIterator = AsyncIterator.EmptyIterator;
const IntegerIterator = AsyncIterator.IntegerIterator;

function checkIntegerStreams (leftOptions, rightOptions, funJoin, streamFunc, done)
{
    let leftStream = new IntegerIterator(leftOptions);
    let rightStream = new IntegerIterator(rightOptions);
    let stream = streamFunc(leftStream, rightStream, funJoin);
    let expected = [];
    for (let i = leftOptions.start; i <= leftOptions.end; ++i)
        for (let j = rightOptions.start; j <= rightOptions.end; ++j)
            if (funJoin(i, j))
                expected.push(funJoin(i, j));
    stream.on('data', data =>
    {
        let find = expected.find(o => _.isEqual(o, data));
        assert(find, 'unexpected value ' + data);
        find.matched = true;
    });
    stream.on('end', () =>
    {
        assert(expected.every(entry => entry.matched), 'not all expected values were matched');
        done();
    })
}

// streamFunc should take a left stream, right stream and join function as input and return a stream object
function testStream (streamFunc, title)
{
    describe(title, () =>
    {
        it('merges 2 streams of length 3', done =>
        {
            let leftOptions = {start: 0, end: 2};
            let rightOptions = {start: 3, end: 5};
            let funJoin = (left, right) => { return { left, right } };
            checkIntegerStreams(leftOptions, rightOptions, funJoin, streamFunc, done)
        });
    });
}

module.exports = {
    testStream: testStream
};