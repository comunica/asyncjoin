
const genericTest = require('./genericTest');
const NestedLoopJoin = require('../join/NestedLoopJoin');

describe('NestedloopJoin', () =>
{
    genericTest.testStream((left, right, funJoin) => new NestedLoopJoin(left, right, funJoin));
});