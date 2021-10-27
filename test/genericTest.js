
const _ = require('lodash');
const assert = require('assert');
const { IntegerIterator, EmptyIterator, ArrayIterator } = require('asynciterator');

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

function newErrorStream() {
    const iterator = new ArrayIterator([], { autoStart: false });
    iterator.read = () => {
        iterator.destroy(new Error('Error in iterator'));
    };
    return iterator;
}

// streamFunc should take a left stream, right stream and join function as input and return a stream object
function testStream (streamFunc)
{
    it('merges 2 streams of length 3', done =>
    {
        let leftOptions = {start: 0, end: 2};
        let rightOptions = {start: 3, end: 5};
        let funJoin = (left, right) => { return { left, right } };
        checkIntegerStreams(leftOptions, rightOptions, funJoin, streamFunc, done)
    });

    it('merges 2 streams of length 100', done =>
    {
        let leftOptions = {start: 0, end: 99};
        let rightOptions = {start: 3, end: 102};
        let funJoin = (left, right) => { return left === right ? { left, right } : null };
        checkIntegerStreams(leftOptions, rightOptions, funJoin, streamFunc, done)
    });

    it('merges an empty stream with a stream of length 3', done =>
    {
        let leftOptions = {start: 0, end: -1};
        let rightOptions = {start: 3, end: 5};
        let funJoin = (left, right) => { return { left, right } };
        checkIntegerStreams(leftOptions, rightOptions, funJoin, streamFunc, done)
    });

    it('merges a stream of length 3 with an empty stream', done =>
    {
        let leftOptions = {start: 0, end: 2};
        let rightOptions = {start: 3, end: 2};
        let funJoin = (left, right) => { return { left, right } };
        checkIntegerStreams(leftOptions, rightOptions, funJoin, streamFunc, done)
    });

    it('merges 2 empty streams', done =>
    {
        let leftOptions = {start: 0, end: -1};
        let rightOptions = {start: 3, end: 2};
        let funJoin = (left, right) => { return { left, right } };
        checkIntegerStreams(leftOptions, rightOptions, funJoin, streamFunc, done)
    });

    it('supports join functions returning null', done =>
    {
        let leftOptions = {start: 0, end: 2};
        let rightOptions = {start: 3, end: 5};
        let funJoin = (left, right) => { return ((left % 2) === (right % 2)) ? { left, right } : null };
        checkIntegerStreams(leftOptions, rightOptions, funJoin, streamFunc, done)
    });

    it('can handle streams that are already done', () =>
    {
        let funJoin = (left, right) => { return { left, right } };
        let stream = streamFunc(new EmptyIterator(), new EmptyIterator(), funJoin);
    });

    it('propagates errors in the left stream', done =>
    {
        let funJoin = (left, right) => { return { left, right } };
        let stream = streamFunc(newErrorStream(), new ArrayIterator([1]), funJoin);
        let doneCalled = false;
        stream.on('error', () => {
            if (!doneCalled) {
                done();
            }
            doneCalled = true;
        });
        stream.on('data', () => {
            // Do nothing
        });
        stream.on('end', () => {
            if (!doneCalled) {
                done(new Error('Stream ended before end event emitted'));
            }
        });
    });

    it('propagates errors in the right stream', done =>
    {
        let funJoin = (left, right) => { return { left, right } };
        let stream = streamFunc(new IntegerIterator({start: 3, end: 100}), newErrorStream(), funJoin);
        let doneCalled = false;
        stream.on('error', () => {
            if (!doneCalled) {
                done();
            }
            doneCalled = true;
        });
        stream.on('data', () => {
            // Do nothing
        });
        stream.on('end', () => {
            if (!doneCalled) {
                done(new Error('Stream ended before end event emitted'));
            }
        });
    });
}

module.exports = {
    testStream: testStream
};
