'use strict';

const NahmiiContract = require('../contract');

class NullSettlementChallengeContract extends NahmiiContract {
    constructor(walletOrProvider) {
        super('NullSettlementChallengeByPayment', walletOrProvider);
    }
}

module.exports = NullSettlementChallengeContract;
