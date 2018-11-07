'use strict';

const ethers = require('ethers');
const driipSettlementDeployment = require('./abis/DriipSettlement');

class DriipSettlementContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const address = driipSettlementDeployment.networks[walletOrProvider.chainId || walletOrProvider.provider.chainId].address;
        super(address, driipSettlementDeployment.abi, walletOrProvider);
    }
}

module.exports = DriipSettlementContract;
