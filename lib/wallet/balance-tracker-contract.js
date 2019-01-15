'use strict';

const ethers = require('ethers');

class BalanceTrackerContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        const balanceTrackerDeployment = require(`./abis/${networkName}/BalanceTracker.json`);
        const chainId = provider.network.chainId;
        const balanceTrackerAddress = balanceTrackerDeployment.networks[chainId].address;

        super(balanceTrackerAddress, balanceTrackerDeployment.abi, walletOrProvider);
    }
}

module.exports = BalanceTrackerContract;
