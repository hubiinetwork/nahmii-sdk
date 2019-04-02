'use strict';

const ethers = require('ethers');

class DriipSettlementChallengeContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        const nahmiiAbstractionsModule = networkName === 'ropsten' ? 'nahmii-contract-abstractions-ropsten' : 'nahmii-contract-abstractions';
        const driipSettlementChallengeDeployment = require(`${nahmiiAbstractionsModule}/build/contracts/DriipSettlementChallengeByPayment.json`);
        const chainId = provider.network.chainId;
        const driipSettlementChallengeAddress = driipSettlementChallengeDeployment.networks[chainId].address;
        super(driipSettlementChallengeAddress, driipSettlementChallengeDeployment.abi, walletOrProvider);
    }
}

module.exports = DriipSettlementChallengeContract;
