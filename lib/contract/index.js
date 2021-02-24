'use strict';

/**
 * @module nahmii-sdk
 */

const ethers = require('ethers');
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
     * @param {string} abstractionName - Name of the nahmii contract to load
     * @param {NahmiiProvider|Wallet} walletOrProvider - Wallet or provider connected to nahmii cluster
     */
    constructor(abstractionName, walletOrProvider) {
        // if (!_isCalledFromFactory) {
        //     console.warn('WARNING: Calling NahmiiContract constructor directly is deprecated and will be removed.');
        //     console.warn('         Use factory function NahmiiContract.from() instead.');
        // }

        const provider = walletOrProvider.provider || walletOrProvider;
        const deployment = contractAbstractions.get(provider.network.name, abstractionName);
        const address = deployment.networks[provider.network.chainId].address;

        super(address, deployment.abi, walletOrProvider);

        _provider.set(this, provider);
        _contractName.set(this, abstractionName);
    }

    /**
     * Checks if contract is a valid nahmii contract.
     * For a nahmii contract to be valid, it must be
     * registered in the nahmii cluster and deployed to the block chain.
     * The function accesses the block chain which may pose some delay.
     * @throws {Error} Throws if contract is not valid.
     */
    async assertIsValid() {

        const provider = _provider.get(this);
        const clusterInformation = await provider.getClusterInformation();

        if (provider.network.name !== clusterInformation.ethereum.net) {
            const msg = 'Provider network name does not match cluster information.\n' +
                `  Provider network: '${provider.network.name}.\n` +
                `   Cluster network: '${clusterInformation.ethereum.net}'.`;

            throw new Error(msg);
        }

        const contractName = _contractName.get(this);
        const registeredAddressStr = clusterInformation.ethereum.contracts[contractName];

        if (! registeredAddressStr)
            throw new Error(`Contract name is not registered in the clusterInformation: '${contractName}'`);

        const registeredAddress = EthereumAddress.from(registeredAddressStr);

        if (! registeredAddress)
            throw new Error(`Registered contract address is not parsable: '${registeredAddressStr}'`);

        const thisAddress = EthereumAddress.from(this.address);

        if (! thisAddress)
            throw new Error(`Contract address is not parsable: '${this.address}'`);

        if (! thisAddress.isEqual(registeredAddress)) {
            const msg = 'Contract address does not match registered address in cluster.\n' +
                `    Contract address: '${thisAddress.toString()}.\n` +
                `  Registered address: '${registeredAddress.toString()}'.`;

            throw new Error(msg);
        }

        const contractCode = await provider.getCode(this.address);

        if (contractCode.length <= 2)
            throw new Error(`Contract is not deployed: '${contractName}'`);
    }

    /**
     * Checks if contract is a valid nahmii contract.
     * Calls {@link NahmiiContract#assertIsValid} but does not throw any Error.
     * @returns {Boolean} True if valid. False if not.
     */
    async validate() {
        try {
            await this.assertIsValid();
            return true;
        }
        catch (_) {
            return false;
        }
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
