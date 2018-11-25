'use strict';

const ethers = require('ethers');
const nullSettlementDeployment = require('./abis/NullSettlement');

class NullSettlementContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const address = nullSettlementDeployment.networks[walletOrProvider.chainId || walletOrProvider.provider.chainId].address;
        super(address, nullSettlementDeployment.abi, walletOrProvider);
    }
}

module.exports = NullSettlementContract;
