'use strict';

/**
 * @module nahmii-sdk
 */

const dbg = require('./dbg');
const ethers = require('ethers');
const ClientFundContract = require('./client-fund-contract');
const Erc20Contract = require('./erc20-contract');

const _clientFund = new WeakMap();

/**
 * @class Wallet
 * A class for performing various operations on a wallet.
 * @alias module:nahmii-sdk
 */
class Wallet extends ethers.Wallet {
    /**
     * Create a Wallet
     * @param {string} privateKey - The private key for the wallet
     * @param {NahmiiProvider} provider - A NahmiiProvider instance
     */
    constructor(privateKey, provider) {
        super(privateKey, provider);
        _clientFund.set(this, new ClientFundContract(this));
    }

    /**
     * Retrieves avaliable nahmii balance for current wallet.
     * @return {Promise} A promise that resolves into a mapping from symbol to human readable amount.
     */
    async getAvaliableBalances() {
        return this.provider.getAvaliableBalances(this.address);
    }

    /**
     * Retrieves all nahmii staged balances for the wallet.
     * @return {Promise} A promise that resolves into a balances object.
     */
    getStagedBalances() {
        return this.provider.getStagedBalances(this.address);
    }

    /**
     * Retrieves all balances locked up in the process of staging for the wallet.
     * @return {Promise} A promise that resolves into a balances object.
     */
    getStagingBalances() {
        return this.provider.getStagingBalances(this.address);
    }

    /**
     * Retrieves all nahmii staged balances for the wallet.
     * @return {Promise} A promise that resolves into a balances object.
     */
    getBaseLayerBalances() {
        return this.provider.getBaseLayerBalances(this.address);
    }

    /**
     * Initiates the deposit of ETH from the on-chain balance of the wallet to nahmii.
     * @param {(number|string)} amountEth - The amount of ETH to deposit.
     * @param [options]
     * @return {Promise} A promise that resolves into a transaction hash.
     * @example
     * const txHash = await wallet.depositEth('1.1', {gasLimit: 200000});
     * const receipt = await wallet.provider.getTransactionConfirmation(txHash);
     */
    depositEth(amountEth, options) {
        options = { gasLimit: 600000, ...options };
        const amountWei = ethers.utils.parseEther(amountEth.toString());
        const clientFund = _clientFund.get(this);
        dbg('Sending ' + amountWei + ' wei to ' + clientFund.address + ' from ' + this.address);
        return this.send(clientFund.address, amountWei, options);
    }
    
    /**
     * Initiates the deposit of a token from the wallet's on-chain balance to nahmii by calling the 
     * approve method of the token smart contract.
     * @param {(number|string)} amount - The amount of currency to deposit.
     * @param {string} symbol - The currency symbol
     * @param [options]
     * @returns {Promise} A promise that resolves into a transaction hash.
     * @see https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-receipts
     * @example
     * const txHash = await wallet.depositToken('1.1', 'HBT', {gasLimit: 200000});
     * const receipt = await wallet.provider.getTransactionConfirmation(txHash);
     */
    async approveTokenDeposit(amount, symbol, options) {
        options = { gasLimit: 600000, ...options };
        const tokenInfo = await getTokenInfo.call(this, symbol);
        const tokenContract = new Erc20Contract(tokenInfo.currency, this);
        const amountBN = ethers.utils.parseUnits(amount.toString(), tokenInfo.decimals);
        const clientFund = _clientFund.get(this);

        try {
            return await tokenContract.approve(clientFund.address, amountBN, options);
        } catch(e) {
            throw new Error(`Failed to approve token deposit: ${e}`);
        }
    }

    /**
     * Initiates the completion of a deposit of a token from a wallet's on-chain balance 
     * to nahmii by calling the depositTokens method of the nahmii clientFund smart contract.
     * Requires approveTokenDeposit to have been called first.
     * @param {(number|string)} amount - The amount of currency to deposit.
     * @param {string} symbol - The currency symbol
     * @param [options]
     * @returns {Promise} A promise that resolves into a transaction hash.
     * @example
     * const txHash = await wallet.completeTokenDepsoit('1.1', 'HBT', {gasLimit: 200000});
     * const receipt = await wallet.provider.getTransactionConfirmation(txHash);
     */
    async completeTokenDeposit(amount, symbol, options) {
        options = { gasLimit: 600000, ...options };
        const tokenInfo = await getTokenInfo.call(this, symbol);
        const tokenContract = new Erc20Contract(tokenInfo.currency, this);
        const amountBN = ethers.utils.parseUnits(amount.toString(), tokenInfo.decimals);
        const clientFund = _clientFund.get(this);

        try {
            return await clientFund.depositTokens(amountBN, tokenContract.address, 0, 'ERC20', options);
        } catch(e) {
            throw new Error(`Failed to complete token deposit: ${e}`);
        }
    }

    /**
     * Withdraw an amount of ETH or ERC20 tokens from nahmii to base layer.
     * @param {MonetaryAmount} monetaryAmount - The amount to withdraw from nahmii.
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     * @example
     * let amountBN = ethers.utils.parseUnits('1.1', 18);
     * let currency = '0x0000000000000000000000000000000000000000'
     * let monetaryAmount = new nahmii.MonetaryAmount(amountBN, currency, 0)
     * let hashObj = await wallet.withdraw(monetaryAmount, {gasLimit: 200000});
     */
    async withdraw(monetaryAmount, options = {}) {
        const { amount, currency } = monetaryAmount.toJSON();
        const clientFund = _clientFund.get(this);
        return await clientFund.withdraw(amount, currency.ct, currency.id, '', options);
    }

    /**
     * Unstage an amount of ETH or ERC20 tokens from staged balance back to nahmii available balance.
     * @param {MonetaryAmount} monetaryAmount - The amount unstage from staged balance.
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     * @example
     * let amountBN = ethers.utils.parseUnits('1.1', 18);
     * let currency = '0x0000000000000000000000000000000000000000'
     * let monetaryAmount = new nahmii.MonetaryAmount(amountBN, currency, 0)
     * let hashObj = await wallet.unstage(monetaryAmount, {gasLimit: 200000});
     */
    async unstage(monetaryAmount, options = {}) {
        const { amount, currency } = monetaryAmount.toJSON();
        const clientFund = _clientFund.get(this);
        return await clientFund.unstage(amount, currency.ct, currency.id, options);
    }
}

module.exports = Wallet;


/**
 * @private - invoke bound to instance.
 * Retrieves information about the token that has the specified symbol.
 * @param {string} symbolOrAddress - token symbol or address
 * @param {boolean} byAddress - a flag to tell whether to look up by symbol or address
 * @returns {Promise<Object>}
 */
async function getTokenInfo(symbolOrAddress, byAddress) {
    const supportedTokens = await this.provider.getSupportedTokens();
    const searchBy = byAddress ? 'currency' : 'symbol';
    const tokenInfo = supportedTokens.find(t => t[searchBy].toUpperCase() === symbolOrAddress.toUpperCase());
    if (!tokenInfo)
        throw new Error('Unknown currency. See "nahmii show tokens" for a list of supported tokens.');
    return tokenInfo;
}

/**
 * @private - invoke bound to instance.
 * Retrieves the API access token for nahmii APIs.
 * @returns {Promise<void>}
 */
// eslint-disable-next-line
async function getApiAccessToken() {
    return this.provider.getApiAccessToken();
}
