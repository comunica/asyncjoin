
const genericTest = require('./genericTest');
const HashJoin = require('../join/HashJoin');

describe('HashJoin', () =>
{
    genericTest.testStream((left, right, funJoin, joinType) => new HashJoin(left, right, a => 1, funJoin, joinType));
});