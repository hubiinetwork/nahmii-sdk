'use strict';

const ethers = require('ethers');
const nullSettlementChallengeDeployment = require('./abis/NullSettlementChallenge');

class NullSettlementChallengeContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const nullSettlementChallengeAddress = nullSettlementChallengeDeployment.networks[walletOrProvider.chainId || walletOrProvider.provider.chainId].address;
        super(nullSettlementChallengeAddress, nullSettlementChallengeDeployment.abi, walletOrProvider);
    }
}

module.exports = NullSettlementChallengeContract;
