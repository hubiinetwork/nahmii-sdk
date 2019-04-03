'use strict';

const ethers = require('ethers');

class NullSettlementChallengeContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        let nullSettlementChallengeDeployment;

        if (networkName === 'ropsten') 
            nullSettlementChallengeDeployment = require('nahmii-contract-abstractions-ropsten/build/contracts/NullSettlementChallengeByPayment.json');
        
        const chainId = provider.network.chainId;
        const nullSettlementChallengeAddress = nullSettlementChallengeDeployment.networks[chainId].address;
        super(nullSettlementChallengeAddress, nullSettlementChallengeDeployment.abi, walletOrProvider);
    }
}

module.exports = NullSettlementChallengeContract;
