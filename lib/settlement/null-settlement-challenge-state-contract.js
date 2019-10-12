'use strict';

const NahmiiContract = require('../contract');

class NullSettlementChallengeState extends NahmiiContract {
    constructor(walletOrProvider) {
        super('NullSettlementChallengeState', walletOrProvider);
    }
}

module.exports = NullSettlementChallengeState;
