'use strict';

const NahmiiContract = require('../contract');

class DriipSettlementChallengeState extends NahmiiContract {
    constructor(walletOrProvider) {
        super('DriipSettlementChallengeState', walletOrProvider);
    }
}

module.exports = DriipSettlementChallengeState;
