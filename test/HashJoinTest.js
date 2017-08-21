
const genericTest = require('./genericTest');
const HashJoin = require('../join/HashJoin');

genericTest.testStream((left, right, funJoin) =>
{
    return new HashJoin(left, right, a => 1, funJoin);
}, 'HashJoin');