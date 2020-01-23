'use strict';

/**
 * @module nahmii-sdk
 */

const ethers = require('../ethers');
const erc20Abi = require('./abis/erc20.json');

const _decimals = new WeakMap();

/**
 * @class Erc20Contract
 * A class for performing various operations on an ERC20 contract.
 * @alias module:nahmii-sdk
 */
class Erc20Contract extends ethers.Contract {
    /**
     * Construct a new ERC20 contract wrapper
     * @param {string} contractAddress - Address of ERC20 contract
     * @param {Wallet|NahmiiProvider} walletOrProvider - A nahmii wallet or provider
     * @param {number} decimals - Number of decimals for the token
     */
    constructor(contractAddress, walletOrProvider, decimals) {
        super(contractAddress, erc20Abi, walletOrProvider);
        _decimals.set(this, decimals);
    }

    /**
     * Parses a string to a BigNumber, taking into account the number of
     * decimals for this specific token.
     * @param {string} string - String to parse
     * @returns {BigNumber} - A big number representation of the input value
     */
    parse(string) {
        return ethers.utils.parseUnits(string, _decimals.get(this));
    }

    /**
     * Factory method for creating a new ERC20 wrapper instance from a symbol.
     * @param {string} symbol - The symbol of the supported token
     * @param {Wallet|NahmiiProvider} walletOrProvider - A nahmii wallet or provider
     * @returns {Promise<Erc20Contract>}
     */
    static async from(symbol, walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const tokenInfo = await provider.getTokenInfo(symbol);
        return new Erc20Contract(tokenInfo.currency, walletOrProvider, tokenInfo.decimals);
    }
}

module.exports = Erc20Contract;
