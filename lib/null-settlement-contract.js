'use strict';

const ethers = require('ethers');
const nullSettlementDeployment = require('./abis/NullSettlement.json');

class NullSettlementContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const chainId = provider.network.chainId;
        const address = nullSettlementDeployment.networks[chainId].address;
        super(address, nullSettlementDeployment.abi, walletOrProvider);
    }
}

module.exports = NullSettlementContract;
