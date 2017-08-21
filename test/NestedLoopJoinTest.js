
const genericTest = require('./genericTest');
const NestedLoopJoin = require('../join/NestedLoopJoin');

genericTest.testStream((left, right, funJoin) =>
{
    return new NestedLoopJoin(left, right, funJoin);
}, 'NestedLoopJoin');