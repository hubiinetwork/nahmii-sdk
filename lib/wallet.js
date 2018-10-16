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
     * Deposits ETH from the on-chain balance of the wallet to nahmii.
     * @param {(number|string)} amountEth - The amount of ETH to deposit.
     * @param [options]
     * @return {Promise} A promise that resolves into a transaction receipt.
     * @see https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-receipts
     * @example
     * let receipt = await wallet.depositEth('1.1', {gasLimit: 200000});
     */
    async depositEth(amountEth, options) {
        const amountWei = ethers.utils.parseEther(amountEth.toString());
        const clientFund = _clientFund.get(this);
        dbg('Sending ' + amountWei + ' wei to ' + clientFund.address + ' from ' + this.address);
        const tx = await this.send(clientFund.address, amountWei, options);
        return this.provider.waitForConfirmation(tx.hash);
    }

    /**
     * Deposits a token from the on-chain balance of the wallet to nahmii.
     * @param {(number|string)} amount - The amount of currency to deposit.
     * @param {string} symbol - The currency symbol
     * @param [options]
     * @returns {Promise} A promise that resolves into an array of transaction receipts.
     * @see https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-receipts
     * @example
     * let receipts = await wallet.depositToken('1.1', 'TT1', {gasLimit: 200000});
     */
    async depositToken(amount, symbol, options) {
        const tokenInfo = await getTokenInfo.call(this, symbol);
        const amountBN = ethers.utils.parseUnits(amount.toString(), tokenInfo.decimals);
        const tokenContract = new Erc20Contract(tokenInfo.currency, this);
        const clientFund = _clientFund.get(this);

        try {
            var approvalTx = await tokenContract.approve(clientFund.address, amountBN, options);
            dbg('ApproveTX: ' + JSON.stringify(approvalTx));

            var approvalTxReceipt = await this.provider.waitForConfirmation(approvalTx.hash);
            dbg('ApproveTX (receipt): ' + JSON.stringify(approvalTxReceipt));
        }
        catch (err) {
            dbg(err);
            throw new Error('Failed to approve ERC20 token payment in time!');
        }

        if (approvalTxReceipt.status === 0)
            throw new Error('Pre-approval transaction failed!');

        try {
            var depositTx = await clientFund.depositTokens(amountBN, tokenContract.address, '0', 'erc20', options);
            dbg('DepositTX: ' + JSON.stringify(depositTx));

            var depositTxReceipt = await this.provider.waitForConfirmation(depositTx.hash);
            dbg('DepositTX (receipt): ' + JSON.stringify(depositTxReceipt));
        }
        catch (err) {
            dbg(err);
            throw new Error('Failed to deposit token in time!');
        }

        if (depositTxReceipt.status === 0)
            throw new Error('Deposit transaction failed!');

        return [approvalTxReceipt, depositTxReceipt];
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
