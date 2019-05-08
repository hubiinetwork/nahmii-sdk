'use strict';

const NahmiiContract = require('../contract');

class BalanceTrackerContract extends NahmiiContract {
    constructor(walletOrProvider) {
        super('BalanceTracker', walletOrProvider);
    }
}

module.exports = BalanceTrackerContract;
