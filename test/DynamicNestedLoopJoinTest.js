
const genericTest = require('./genericTest');
const { dynamicNestedLoopJoin } = require('../dist/DynamicNestedLoopJoin');

describe('DynamicNestedLoopJoin', () => {
    genericTest.testStream((left, right, funJoin) => dynamicNestedLoopJoin(left, () => right.clone(), funJoin));
});
