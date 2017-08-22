
const genericTest = require('./genericTest');
const HashJoin = require('../join/HashJoin');

describe('HashJoin', () =>
{
    genericTest.testStream((left, right, funJoin) => new HashJoin(left, right, a => 1, funJoin));
});