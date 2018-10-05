'use strict';

const ethers = require('ethers');
const clientFundDeployment = require('./abis/ClientFund');

class ClientFundContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const chainId = provider.network.chainId;
        const clientFundAddress = clientFundDeployment.networks[chainId].address;
        super(clientFundAddress, clientFundDeployment.abi, walletOrProvider);
    }
}

module.exports = ClientFundContract;
