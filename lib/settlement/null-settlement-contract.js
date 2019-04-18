'use strict';

const ethers = require('ethers');

class NullSettlementContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        const mappings = {
            ropsten: require('nahmii-contract-abstractions-ropsten/build/contracts/NullSettlement.json'),
            homestead: require('nahmii-contract-abstractions/build/contracts/NullSettlement.json')
        };
        
        const nullSettlementDeployment = mappings[networkName];
        if (!nullSettlementDeployment) 
            throw new Error('Unknown network name: ' + networkName);
        

        const chainId = provider.network.chainId;
        const address = nullSettlementDeployment.networks[chainId].address;
        super(address, nullSettlementDeployment.abi, walletOrProvider);
    }
}

module.exports = NullSettlementContract;
