'use strict';

const ethers = require('ethers');

class ClientFundContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        const clientFundDeployment = require(`./abis/${networkName}/ClientFund.json`);
        const chainId = provider.network.chainId;
        const clientFundAddress = clientFundDeployment.networks[chainId].address;

        super(clientFundAddress, clientFundDeployment.abi, walletOrProvider);
    }
}

module.exports = ClientFundContract;
