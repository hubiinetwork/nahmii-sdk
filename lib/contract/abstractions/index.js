'use strict';

const ropstenAbstractions = require('nahmii-contract-abstractions-ropsten');

// TODO: Fix once mainnet abstractions factory is available
//const homesteadAbstractions = require('nahmii-contract-abstractions');
const homesteadAbstractions = {
    getAbstraction: function getAbstraction(name) {
        return require(`nahmii-contract-abstractions/build/contracts/${name}.json`);
    }
};

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
