'use strict';

const ethers = require('ethers');
const exchangeDeployment = require('./abis/Exchange');

class ExchangeContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const exchangeAddress = exchangeDeployment.networks[walletOrProvider.chainId || walletOrProvider.provider.chainId].address;
        super(exchangeAddress, exchangeDeployment.abi, walletOrProvider);
    }
}

module.exports = ExchangeContract;
