'use strict';

const ethers = require('ethers');

class NullSettlementContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        const nahmiiAbstractionsModule = networkName === 'ropsten' ? 'nahmii-contract-abstractions-ropsten' : 'nahmii-contract-abstractions';
        const nullSettlementStateDeployment = require(`${nahmiiAbstractionsModule}/build/contracts/NullSettlementState.json`);
        const chainId = provider.network.chainId;
        const address = nullSettlementStateDeployment.networks[chainId].address;
        super(address, nullSettlementStateDeployment.abi, walletOrProvider);
    }
}

module.exports = NullSettlementContract;
