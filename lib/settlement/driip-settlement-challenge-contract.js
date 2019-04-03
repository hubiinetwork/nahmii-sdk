'use strict';

const ethers = require('ethers');

class DriipSettlementChallengeContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        let driipSettlementChallengeDeployment;
        
        if (networkName === 'ropsten') 
            driipSettlementChallengeDeployment = require('nahmii-contract-abstractions-ropsten/build/contracts/DriipSettlementChallengeByPayment.json');
        
        const chainId = provider.network.chainId;
        const driipSettlementChallengeAddress = driipSettlementChallengeDeployment.networks[chainId].address;
        super(driipSettlementChallengeAddress, driipSettlementChallengeDeployment.abi, walletOrProvider);
    }
}

module.exports = DriipSettlementChallengeContract;
