'use strict';

const NahmiiContract = require('../contract');

class NullSettlementContract extends NahmiiContract {
    constructor(walletOrProvider) {
        super('NullSettlement', walletOrProvider);
    }
}

module.exports = NullSettlementContract;
