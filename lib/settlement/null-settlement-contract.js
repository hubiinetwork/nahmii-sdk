'use strict';

const NahmiiContract = require('../contract');

class NullSettlementStateContract extends NahmiiContract {
    constructor(walletOrProvider) {
        super('NullSettlement', walletOrProvider);
    }
}

module.exports = NullSettlementStateContract;
