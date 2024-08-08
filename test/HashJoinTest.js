
const genericTest = require('./genericTest');
const { HashJoin } = require('../dist/HashJoin');

describe('HashJoin', () =>
{
    genericTest.testStream((left, right, funJoin) => new HashJoin(left, right, a => 1, funJoin));
});