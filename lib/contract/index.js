'use strict';

/**
 * @module nahmii-sdk
 */

const ethers = require('../ethers');
const contractAbstractions = require('./abstractions');
const {EthereumAddress} = require('nahmii-ethereum-address');

const _provider = new WeakMap();
const _contractName = new WeakMap();
// let _isCalledFromFactory = false;

/**
 * @class NahmiiContract
 * A class providing access to the various nahmii contracts by name.
 * To validate that the constructed contract object actually matches a contract
 * officially in use by the nahmii cluster, use the `validate()` method.
 * @alias module:nahmii-sdk
 * @example
 * const {NahmiiContract} = require('nahmii-sdk');
 * ...
 * const niiContract = new NahmiiContract('NahmiiToken', nahmiiProvider);
 *
 * if (await niiContract.validate()) {
 *     const balance = await niiContract.balanceOf(someWalletAddress);
 * }
 * else {
 *     throw new Error('Contract is not associated with the current cluster');
 * }
 */
class NahmiiContract extends ethers.Contract {
    /**
     * (Deprecated) Constructs a new contract wrapper instance by loading the correct ABIs
     * based on the name of the contract and the network that the provider or
     * wallet is connected to.
     * @param {string} contractName - Name of the nahmii contract to load
     * @param {NahmiiProvider|Wallet} walletOrProvider - Wallet or provider connected to nahmii cluster
     */
    constructor(contractName, walletOrProvider) {
        // if (!_isCalledFromFactory) {
        //     console.warn('WARNING: Calling NahmiiContract constructor directly is deprecated and will be removed.');
        //     console.warn('         Use factory function NahmiiContract.from() instead.');
        // }

        const provider = walletOrProvider.provider || walletOrProvider;
        const deployment = contractAbstractions.get(provider.network.name, contractName);
        const address = deployment.networks[provider.network.chainId].address;

        super(address, deployment.abi, walletOrProvider);

        _provider.set(this, provider);
        _contractName.set(this, contractName);
    }

    async validate() {
        const cn = _contractName.get(this);
        const p = _provider.get(this);

        const a = EthereumAddress.from(this.address);
        if (!a)
            return false;

        const ci = await p.getClusterInformation();

        if (p.network.name !== ci.ethereum.net)
            return false;

        if (!ci.ethereum.contracts[cn])
            return false;

        return a.isEqual(EthereumAddress.from(ci.ethereum.contracts[cn]));
    }

    /**
     * Constructs a new contract wrapper instance by loading the correct ABIs
     * based on the name of the contract and the network that the provider or
     * wallet is connected to.
     * @param {string} contractName - Name of the nahmii contract to load
     * @param {NahmiiProvider|Wallet} walletOrProvider - Wallet or provider connected to nahmii cluster
     * @returns {NahmiiContract|null} - Contract or null if contract could not be resolved
     */

    static async from (contractName, walletOrProvider) {

        // _isCalledFromFactory = true;
        let contract = new NahmiiContract(contractName, walletOrProvider);
        // _isCalledFromFactory = false;

        if (!await contract.validate()) {
            const varName = 'ACCEPT_INVALID_CONTRACTS';
            console.warn(`WARNING: Contact validation of "${contractName}" failed. address: ${contract.address}`);

            if (!process.env[varName]) {
                console.warn(`         Specify environment variable "${varName}=1" to force use of invalid contracts.`);
                contract = null;
            }
        }

        return contract;
    }
}

module.exports = NahmiiContract;
