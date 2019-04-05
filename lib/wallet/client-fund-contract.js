'use strict';

const NahmiiContract = require('../contract');

class ClientFundContract extends NahmiiContract {
    constructor(walletOrProvider) {
        super('ClientFund', walletOrProvider);
    }
}

module.exports = ClientFundContract;
