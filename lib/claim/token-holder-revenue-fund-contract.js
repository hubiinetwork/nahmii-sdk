'use strict';

const NahmiiContract = require('../contract');

class TokenHolderRevenueFundContract extends NahmiiContract {
    constructor(walletOrProvider, abstractionName) {
        super(abstractionName || 'TokenHolderRevenueFund', walletOrProvider);
    }
}

module.exports = TokenHolderRevenueFundContract;
