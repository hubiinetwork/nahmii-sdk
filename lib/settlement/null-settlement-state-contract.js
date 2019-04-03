'use strict';

const ethers = require('ethers');

class NullSettlementContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;

        let nullSettlementStateDeployment;
        if (networkName === 'ropsten') 
            nullSettlementStateDeployment = require('nahmii-contract-abstractions-ropsten/build/contracts/NullSettlementState.json');
        
        const chainId = provider.network.chainId;
        const address = nullSettlementStateDeployment.networks[chainId].address;
        super(address, nullSettlementStateDeployment.abi, walletOrProvider);
    }
}

module.exports = NullSettlementContract;
