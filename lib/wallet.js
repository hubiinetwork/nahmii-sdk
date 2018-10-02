'use strict';

/**
 * @module nahmii-sdk
 */

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
        const apiAccessToken = await getApiAccessToken.call(this);
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
        const rawTx = {
            to: clientFund.address,
            value: amountWei,
            ...options
        }
        dbg('Sending ' + amountWei + ' wei to ' + clientFund.address + ' from ' + this.address);
        const txResponse = await this.sendTransaction(rawTx);
        return getTransactionReceipt.call(this, txResponse.hash);
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

            var approvalTxReceipt = await getTransactionReceipt.call(this, approvalTx.hash);
            dbg('ApproveTX (receipt): ' + JSON.stringify(approvalTxReceipt));
        }
        catch (err) {
            dbg(err);
            throw new Error('Failed to approve ERC20 token payment in time!')
        }

        if (approvalTxReceipt.status === 0)
            throw new Error('Pre-approval transaction failed!');

        try {
            var depositTx = await clientFund.depositTokens(amountBN, tokenContract.address, '0', 'erc20', options);
            dbg('DepositTX: ' + JSON.stringify(depositTx));

            var depositTxReceipt = await getTransactionReceipt.call(this, depositTx.hash);
            dbg('DepositTX (receipt): ' + JSON.stringify(depositTxReceipt));
        }
        catch (err) {
            dbg(err);
            throw new Error('Failed to deposit token in time!')
        }

        if (depositTxReceipt.status === 0)
            throw new Error('Deposit transaction failed!');

        return [approvalTxReceipt, depositTxReceipt];
    }
}

module.exports = Wallet;

/**
 * @private - invoke bound to instance.
 * Attempts to get transaction receipt once every second for up to 1 minute.
 * @see https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-receipts
 * @param {string} transactionHash
 * @returns {Promise<Object>}
 */
function getTransactionReceipt(transactionHash) {
    return Promise.retry(() => {
        process.stderr.write('.');
        return deferredIsNotNull(this.provider.getTransactionReceipt(transactionHash))
    }, 60, 1000).then(result => {
        process.stderr.write('\n');
        return result;
    });
}

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

Promise.retry = function(attemptFn, times, delay) {
    return new Promise(function(resolve, reject) {
        let error;

        function attempt() {
            if (!times)
                return reject(error);

            attemptFn()
                .then(resolve)
                .catch(function(e) {
                    times--;
                    error = e;
                    setTimeout(function() {
                        attempt()
                    }, delay);
                });
        }

        attempt();
    });
};

function deferredIsNotNull(promise) {
    return new Promise((resolve, reject) => {
        promise.then(res => {
            if (res !== null)
                resolve(res);
            else
                reject();
        })
    });
}

function dbg(...args) {
    if (process.env.LOG_LEVEL === 'debug')
        console.error(...args);
}
