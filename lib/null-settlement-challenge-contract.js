'use strict';

const ethers = require('ethers');
const nullSettlementChallengeDeployment = require('./abis/NullSettlementChallenge');

class NullSettlementChallengeContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const chainId = provider.network.chainId;
        const nullSettlementChallengeAddress = nullSettlementChallengeDeployment.networks[chainId].address;
        super(nullSettlementChallengeAddress, nullSettlementChallengeDeployment.abi, walletOrProvider);
    }
}

module.exports = NullSettlementChallengeContract;
