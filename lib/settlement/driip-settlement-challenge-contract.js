'use strict';

const NahmiiContract = require('../contract');

class DriipSettlementChallengeContract extends NahmiiContract {
    constructor(walletOrProvider) {
        super('DriipSettlementChallengeByPayment', walletOrProvider);
    }
}

module.exports = DriipSettlementChallengeContract;
