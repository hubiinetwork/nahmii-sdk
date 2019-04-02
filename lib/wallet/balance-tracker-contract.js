'use strict';

const ethers = require('ethers');

class BalanceTrackerContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        const nahmiiAbstractionsModule = networkName === 'ropsten' ? 'nahmii-contract-abstractions-ropsten' : 'nahmii-contract-abstractions';
        const balanceTrackerDeployment = require(`${nahmiiAbstractionsModule}/build/contracts/BalanceTracker.json`);
        const chainId = provider.network.chainId;
        const balanceTrackerAddress = balanceTrackerDeployment.networks[chainId].address;

        super(balanceTrackerAddress, balanceTrackerDeployment.abi, walletOrProvider);
    }
}

module.exports = BalanceTrackerContract;
