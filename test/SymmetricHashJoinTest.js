
const genericTest = require('./genericTest');
const { SymmetricHashJoin } = require('../dist/SymmetricHashJoin');

describe('SymmetricHashJoin', () =>
{
    genericTest.testStream((left, right, funJoin) => new SymmetricHashJoin(left, right, a => 1, funJoin));
});