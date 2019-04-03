'use strict';

const ethers = require('ethers');

class NullSettlementContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        const mappings = {
            ropsten: require('nahmii-contract-abstractions-ropsten/build/contracts/NullSettlementState.json')
        };

        const nullSettlementStateDeployment = mappings[networkName];
        if (!nullSettlementStateDeployment) 
            throw new Error('Unknown network name: ' + networkName);
        
        
        const chainId = provider.network.chainId;
        const address = nullSettlementStateDeployment.networks[chainId].address;
        super(address, nullSettlementStateDeployment.abi, walletOrProvider);
    }
}

module.exports = NullSettlementContract;
