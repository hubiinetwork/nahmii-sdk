'use strict';

const ethers = require('ethers');
const driipSettlementDeployment = require('./abis/DriipSettlement');

class DriipSettlementContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const chainId = provider.network.chainId;
        const address = driipSettlementDeployment.networks[chainId].address;
        super(address, driipSettlementDeployment.abi, walletOrProvider);
    }
}

module.exports = DriipSettlementContract;
