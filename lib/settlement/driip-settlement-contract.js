'use strict';

const ethers = require('ethers');

class DriipSettlementContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        const mappings = {
            ropsten: require('nahmii-contract-abstractions-ropsten/build/contracts/DriipSettlementByPayment.json'),
            homestead: require('nahmii-contract-abstractions/build/contracts/DriipSettlementByPayment.json')
        };
        
        const driipSettlementDeployment = mappings[networkName];
        if (!driipSettlementDeployment) 
            throw new Error('Unknown network name: ' + networkName);
        
        
        const chainId = provider.network.chainId;
        const address = driipSettlementDeployment.networks[chainId].address;
        super(address, driipSettlementDeployment.abi, walletOrProvider);
    }
}

module.exports = DriipSettlementContract;
