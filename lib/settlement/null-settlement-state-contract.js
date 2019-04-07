'use strict';

const NahmiiContract = require('../contract');

class NullSettlementStateContract extends NahmiiContract {
    constructor(walletOrProvider) {
        super('NullSettlementState', walletOrProvider);
    }
}

module.exports = NullSettlementStateContract;
