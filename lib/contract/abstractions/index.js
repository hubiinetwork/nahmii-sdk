'use strict';

const ropstenAbstractions = require('nahmii-contract-abstractions-ropsten');

module.exports = {
    get: function get(networkName, contractName) {
        switch(networkName) {
        case 'ropsten':
            return ropstenAbstractions.getAbstraction(contractName);
        default:
            throw new Error(`Unknown network name: ${networkName}`);
        }
    }
};
