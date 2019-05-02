'use strict';

const ropstenAbstractions = require('nahmii-contract-abstractions-ropsten');
const homesteadAbstractions = require('nahmii-contract-abstractions');

class ContractAbstractions {
    /**
     * Loads and returns a contract abstraction for a nahmii contract deployed
     * to a named network.
     * @param {string} networkName
     * @param {string} contractName
     */
    static get(networkName, contractName) {
        switch (networkName) {
        case 'ropsten':
            return ropstenAbstractions.getAbstraction(contractName);
        case 'homestead':
            return homesteadAbstractions.getAbstraction(contractName);
        default:
            throw new Error(`Unknown network name: ${networkName}`);
        }
    }
}

module.exports = ContractAbstractions;
