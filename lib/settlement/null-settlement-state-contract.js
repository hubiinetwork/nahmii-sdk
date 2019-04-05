'use strict';

const NahmiiContract = require('../contract');

class NullSettlementContract extends NahmiiContract {
    constructor(walletOrProvider) {
        super('NullSettlementState', walletOrProvider);
    }
}

module.exports = NullSettlementContract;
