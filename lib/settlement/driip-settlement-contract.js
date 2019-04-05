'use strict';

const NahmiiContract = require('../contract');

class DriipSettlementContract extends NahmiiContract {
    constructor(walletOrProvider) {
        super('DriipSettlementByPayment', walletOrProvider);
    }
}

module.exports = DriipSettlementContract;
