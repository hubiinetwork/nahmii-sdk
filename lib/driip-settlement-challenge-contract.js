'use strict';

const ethers = require('ethers');
const driipSettlementChallengeDeployment = require('./abis/DriipSettlementChallenge.json');

class DriipSettlementChallengeContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const chainId = provider.network.chainId;
        const driipSettlementChallengeAddress = driipSettlementChallengeDeployment.networks[chainId].address;
        super(driipSettlementChallengeAddress, driipSettlementChallengeDeployment.abi, walletOrProvider);
    }
}

module.exports = DriipSettlementChallengeContract;
