'use strict';

const NahmiiContract = require('../contract');

class TokenHolderRevenueFundContract extends NahmiiContract {
    constructor(walletOrProvider, legacyName) {
        super(legacyName || 'TokenHolderRevenueFund', walletOrProvider);
    }
}

module.exports = TokenHolderRevenueFundContract;
