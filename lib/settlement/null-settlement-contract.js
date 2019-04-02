'use strict';

const ethers = require('ethers');

class NullSettlementContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        const nahmiiAbstractionsModule = networkName === 'ropsten' ? 'nahmii-contract-abstractions-ropsten' : 'nahmii-contract-abstractions';
        const nullSettlementDeployment = require(`${nahmiiAbstractionsModule}/build/contracts/NullSettlement.json`);
        const chainId = provider.network.chainId;
        const address = nullSettlementDeployment.networks[chainId].address;
        super(address, nullSettlementDeployment.abi, walletOrProvider);
    }
}

module.exports = NullSettlementContract;
