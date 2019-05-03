'use strict';

/**
 * @module nahmii-sdk
 */

const ethers = require('ethers');
const contractAbstractions = require('./abstractions');

/**
 * @class NahmiiContract
 * A class providing access to the various nahmii contracts by name.
 * @alias module:nahmii-sdk
 * @example
 * const {NahmiiContract} = require('nahmii-sdk');
 * ...
 * const niiContract = new NahmiiContract('NahmiiToken', nahmiiProvider);
 * const balance = await niiContract.balanceOf(someWalletAddress);
 */
class NahmiiContract extends ethers.Contract {
    /**
     * Constructs a new contract wrapper instance by loading the correct ABIs
     * based on the name of the contract and the network that the provider or
     * wallet is connected to.
     * @param {string} contractName - Name of the nahmii contract to load
     * @param {NahmiiProvider|Wallet} walletOrProvider - Wallet or provider connected to nahmii cluster
     */
    constructor(contractName, walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const deployment = contractAbstractions.get(provider.network.name, contractName);
        const address = deployment.networks[provider.network.chainId].address;

        super(address, deployment.abi, walletOrProvider);
    }
}

module.exports = NahmiiContract;
