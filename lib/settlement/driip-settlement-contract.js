'use strict';

const ethers = require('ethers');

class DriipSettlementContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        let driipSettlementDeployment;
        
        if (networkName === 'ropsten') 
            driipSettlementDeployment = require('nahmii-contract-abstractions-ropsten/build/contracts/DriipSettlementByPayment.json');
        
        const chainId = provider.network.chainId;
        const address = driipSettlementDeployment.networks[chainId].address;
        super(address, driipSettlementDeployment.abi, walletOrProvider);
    }
}

module.exports = DriipSettlementContract;
