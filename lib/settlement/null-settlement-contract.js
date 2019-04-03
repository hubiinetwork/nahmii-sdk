'use strict';

const ethers = require('ethers');

class NullSettlementContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        let nullSettlementDeployment;

        if (networkName === 'ropsten') 
            nullSettlementDeployment = require('nahmii-contract-abstractions-ropsten/build/contracts/NullSettlement.json');
        
        const chainId = provider.network.chainId;
        const address = nullSettlementDeployment.networks[chainId].address;
        super(address, nullSettlementDeployment.abi, walletOrProvider);
    }
}

module.exports = NullSettlementContract;
