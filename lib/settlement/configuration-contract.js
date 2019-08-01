'use strict';

const NahmiiContract = require('../contract');

class ConfigurationContract extends NahmiiContract {
    constructor(walletOrProvider) {
        super('Configuration', walletOrProvider);
    }
}

module.exports = ConfigurationContract;
