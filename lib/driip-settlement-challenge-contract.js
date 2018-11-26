'use strict';

const ethers = require('ethers');
const driipSettlementChallengeDeployment = require('./abis/DriipSettlementChallenge');

class DriipSettlementChallengeContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const driipSettlementChallengeAddress = driipSettlementChallengeDeployment.networks[walletOrProvider.chainId || walletOrProvider.provider.chainId].address;
        super(driipSettlementChallengeAddress, driipSettlementChallengeDeployment.abi, walletOrProvider);
    }
}

module.exports = DriipSettlementChallengeContract;
