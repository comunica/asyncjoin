
const genericTest = require('./genericTest');
const { nestedLoopJoin } = require('../dist/NestedLoopJoin');

describe('NestedloopJoin', () =>
{
    genericTest.testStream((left, right, funJoin) => nestedLoopJoin(left, right, funJoin));
});
