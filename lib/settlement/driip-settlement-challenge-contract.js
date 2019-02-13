'use strict';

const ethers = require('ethers');

class DriipSettlementChallengeContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        const driipSettlementChallengeDeployment = require(`./abis/${networkName}/DriipSettlementChallenge`);
        const chainId = provider.network.chainId;
        const driipSettlementChallengeAddress = driipSettlementChallengeDeployment.networks[chainId].address;
        super(driipSettlementChallengeAddress, driipSettlementChallengeDeployment.abi, walletOrProvider);
    }
}

module.exports = DriipSettlementChallengeContract;
