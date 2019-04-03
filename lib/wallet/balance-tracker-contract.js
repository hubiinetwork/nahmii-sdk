'use strict';

const ethers = require('ethers');

class BalanceTrackerContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        const mappings = {
            homestead: require('nahmii-contract-abstractions/build/contracts/BalanceTracker.json'),
            ropsten: require('nahmii-contract-abstractions-ropsten/build/contracts/BalanceTracker.json')
        };
        
        const balanceTrackerDeployment = mappings[networkName];
        if (!balanceTrackerDeployment) 
            throw new Error('Unknown network name: ' + networkName);
        
        const chainId = provider.network.chainId;
        const balanceTrackerAddress = balanceTrackerDeployment.networks[chainId].address;

        super(balanceTrackerAddress, balanceTrackerDeployment.abi, walletOrProvider);
    }
}

module.exports = BalanceTrackerContract;
