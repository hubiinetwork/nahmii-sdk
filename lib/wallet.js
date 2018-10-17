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
     * Retrieves nahmii balance for current wallet.
     * @return {Promise} A promise that resolves into a mapping from symbol to human readable amount.
     */
    async getNahmiiBalance() {
        await getApiAccessToken.call(this);
        const [nahmiiBalances, supportedTokens] = await Promise.all([
            this.provider.getNahmiiBalances(this.address),
            this.provider.getSupportedTokens()
        ]);

        const currencies = new Map();
        currencies.set('0X0000000000000000000000000000000000000000', {
            symbol: 'ETH',
            decimals: 18
        });
        for (let t of supportedTokens) {
            currencies.set(t.currency.toUpperCase(), {
                symbol: t.symbol,
                decimals: t.decimals
            });
        }

        const nahmiiBalance = {};
        for (let b of nahmiiBalances) {
            const currency = currencies.get(b.currency.ct.toUpperCase());
            nahmiiBalance[currency.symbol] = ethers.utils.formatUnits(b.amount, currency.decimals);
        }

        return nahmiiBalance;
    }

    /**
     * Initiates the deposit of ETH from the on-chain balance of the wallet to nahmii.
     * @param {(number|string)} amountEth - The amount of ETH to deposit.
     * @param [options]
     * @return {Promise} A promise that resolves into a transaction hash.
     * @example
     * const txHash = await wallet.depositEth('1.1', {gasLimit: 200000});
     * const receipt = await wallet.provider.waitForConfirmation(txHash);
     */
    async depositEth(amountEth, options) {
        const amountWei = ethers.utils.parseEther(amountEth.toString());
        const clientFund = _clientFund.get(this);
        dbg('Sending ' + amountWei + ' wei to ' + clientFund.address + ' from ' + this.address);
        return await this.send(clientFund.address, amountWei, options);
    }
    
    /**
     * Initiates the approval of the deposit of a token from the on-chain balance of the wallet to nahmii.
     * @param {(number|string)} amount - The amount of currency to deposit.
     * @param {string} symbol - The currency symbol
     * @param [options]
     * @returns {Promise} A promise that resolves into a transaction hash.
     * @see https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-receipts
     * @example
     * const txHash = await wallet.depositToken('1.1', 'HBT', {gasLimit: 200000});
     * const receipt = await wallet.provider.waitForConfirmation(txHash);
     */
    async initiateTokenDeposit(amount, symbol, options) {
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
     * Initiates the completion of the deposit of a token from the on-chain balance of the wallet to nahmii.
     * @param {(number|string)} amount - The amount of currency to deposit.
     * @param {string} symbol - The currency symbol
     * @param [options]
     * @returns {Promise} A promise that resolves into a transaction hash.
     * @example
     * const txHash = await wallet.completeTokenDepsoit('1.1', 'HBT', {gasLimit: 200000});
     * const receipt = await wallet.provider.waitForConfirmation(txHash);
     */
    async completeTokenDeposit(amount, symbol, options) {
        const tokenInfo = await getTokenInfo.call(this, symbol);
        const tokenContract = new Erc20Contract(tokenInfo.currency, this);
        const amountBN = ethers.utils.parseUnits(amount.toString(), tokenInfo.decimals);
        const clientFund = _clientFund.get(this);

        try {
            return await clientFund.depositTokens(amountBN, tokenContract.address, '0', 'erc20', options);
        } catch(e) {
            throw new Error(`Failed to complete token deposit: ${e}`);
        }
    }
}

module.exports = Wallet;


/**
 * @private - invoke bound to instance.
 * Retrieves information about the token that has the specified symbol.
 * @param {string} symbol
 * @returns {Promise<Object>}
 */
async function getTokenInfo(symbol) {
    const supportedTokens = await this.provider.getSupportedTokens();
    const tokenInfo = supportedTokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
    if (!tokenInfo)
        throw new Error('Unknown currency. See "nahmii show tokens" for a list of supported tokens.');
    return tokenInfo;
}

/**
 * @private - invoke bound to instance.
 * Retrieves the API access token for nahmii APIs.
 * @returns {Promise<void>}
 */
async function getApiAccessToken() {
    return this.provider.getApiAccessToken();
}
