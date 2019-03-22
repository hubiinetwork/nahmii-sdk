'use strict';

const ethers = require('ethers');

class DriipSettlementContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        const driipSettlementDeployment = require(`./abis/${networkName}/DriipSettlementByPayment`);
        const chainId = provider.network.chainId;
        const address = driipSettlementDeployment.networks[chainId].address;
        super(address, driipSettlementDeployment.abi, walletOrProvider);
    }
}

module.exports = DriipSettlementContract;
