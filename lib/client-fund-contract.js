'use strict';

const ethers = require('ethers');
const clientFundDeployment = require('./abis/ClientFund');

class ClientFundContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const clientFundAddress = clientFundDeployment.networks[walletOrProvider.chainId || walletOrProvider.provider.chainId].address;
        super(clientFundAddress, clientFundDeployment.abi, walletOrProvider);
    }
}

module.exports = ClientFundContract;
