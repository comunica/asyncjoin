
const genericTest = require('./genericTest');
const DynamicNestedLoopJoin = require('../join/DynamicNestedLoopJoin');

genericTest.testStream((left, right, funJoin) =>
{
    return new DynamicNestedLoopJoin(left, () => right.clone(), funJoin);
}, 'DynamicNestedLoopJoin');