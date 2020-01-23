'use strict';

const NahmiiContract = require('../contract');

class TokenHolderRevenueFundContract extends NahmiiContract {
    constructor(walletOrProvider) {
        super('TokenHolderRevenueFund', walletOrProvider);
    }
}

module.exports = TokenHolderRevenueFundContract;
