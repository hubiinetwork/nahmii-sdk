'use strict';

const ethers = require('ethers');
const balanceTrackerDeployment = require('./abis/BalanceTracker');

class BalanceTrackerContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const chainId = provider.network.chainId;
        const balanceTrackerAddress = balanceTrackerDeployment.networks[chainId].address;
        super(balanceTrackerAddress, balanceTrackerDeployment.abi, walletOrProvider);
    }
}

module.exports = BalanceTrackerContract;
