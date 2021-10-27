
const genericTest = require('./genericTest');
const DynamicNestedLoopJoin = require('../join/DynamicNestedLoopJoin');

describe('DynamicNestedLoopJoin', () => {
    genericTest.testStream((left, right, funJoin) => new DynamicNestedLoopJoin(left, () => right.clone(), funJoin));
});
