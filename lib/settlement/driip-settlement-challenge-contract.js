'use strict';

const ethers = require('ethers');

class DriipSettlementChallengeContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        const mappings = {
            ropsten: require('nahmii-contract-abstractions-ropsten/build/contracts/DriipSettlementChallengeByPayment.json')
        };
        
        const driipSettlementChallengeDeployment = mappings[networkName];
        if (!driipSettlementChallengeDeployment) 
            throw new Error('Unknown network name: ' + networkName);
        
        
        const chainId = provider.network.chainId;
        const driipSettlementChallengeAddress = driipSettlementChallengeDeployment.networks[chainId].address;
        super(driipSettlementChallengeAddress, driipSettlementChallengeDeployment.abi, walletOrProvider);
    }
}

module.exports = DriipSettlementChallengeContract;
