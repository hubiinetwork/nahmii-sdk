'use strict';

const ethers = require('ethers');

class NullSettlementChallengeContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        const nahmiiAbstractionsModule = networkName === 'ropsten' ? 'nahmii-contract-abstractions-ropsten' : 'nahmii-contract-abstractions';
        const nullSettlementChallengeDeployment = require(`${nahmiiAbstractionsModule}/build/contracts/NullSettlementChallengeByPayment.json`);
        const chainId = provider.network.chainId;
        const nullSettlementChallengeAddress = nullSettlementChallengeDeployment.networks[chainId].address;
        super(nullSettlementChallengeAddress, nullSettlementChallengeDeployment.abi, walletOrProvider);
    }
}

module.exports = NullSettlementChallengeContract;
