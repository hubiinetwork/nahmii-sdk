'use strict';

const ethers = require('ethers');

class NullSettlementChallengeContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        const mappings = {
            ropsten: require('nahmii-contract-abstractions-ropsten/build/contracts/NullSettlementChallengeByPayment.json')
        };

        const nullSettlementChallengeDeployment = mappings[networkName];
        if (!nullSettlementChallengeDeployment) 
            throw new Error('Unknown network name: ' + networkName);
        

        const chainId = provider.network.chainId;
        const nullSettlementChallengeAddress = nullSettlementChallengeDeployment.networks[chainId].address;
        super(nullSettlementChallengeAddress, nullSettlementChallengeDeployment.abi, walletOrProvider);
    }
}

module.exports = NullSettlementChallengeContract;
