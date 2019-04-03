'use strict';

const ethers = require('ethers');

class BalanceTrackerContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        let balanceTrackerDeployment;
        
        if (networkName === 'homestead') 
            balanceTrackerDeployment = require('nahmii-contract-abstractions/build/contracts/BalanceTracker.json');
        
        if (networkName === 'ropsten') 
            balanceTrackerDeployment = require('nahmii-contract-abstractions-ropsten/build/contracts/BalanceTracker.json');
        
        const chainId = provider.network.chainId;
        const balanceTrackerAddress = balanceTrackerDeployment.networks[chainId].address;

        super(balanceTrackerAddress, balanceTrackerDeployment.abi, walletOrProvider);
    }
}

module.exports = BalanceTrackerContract;
