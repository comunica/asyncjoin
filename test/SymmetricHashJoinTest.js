
const genericTest = require('./genericTest');
const SymmetricHashJoin = require('../join/SymmetricHashJoin');

genericTest.testStream((left, right, funJoin) =>
{
    return new SymmetricHashJoin(left, right, a => 1, funJoin);
}, 'SymmetricHashJoin');