'use strict';

const ethers = require('ethers');
const erc20Abi = require('./abis/erc20.json');

class Erc20Contract extends ethers.Contract {
    constructor(contractAddress, walletOrProvider) {
        super(contractAddress, erc20Abi, walletOrProvider);
    }
}

module.exports = Erc20Contract;
