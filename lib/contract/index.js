'use strict';

const ethers = require('ethers');
const contractAbstractions = require('./abstractions');

class NahmiiContract extends ethers.Contract {
    constructor(contractName, walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const deployment = contractAbstractions.get(provider.network.name, contractName);
        const address = deployment.networks[provider.network.chainId].address;

        super(address, deployment.abi, walletOrProvider);
    }
}

module.exports = NahmiiContract;
