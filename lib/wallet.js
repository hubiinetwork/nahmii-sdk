'use strict';

/**
 * @module nahmii-sdk
 */

const dbg = require('./dbg');
const ethers = require('ethers');
const ClientFundContract = require('./client-fund-contract');
const Erc20Contract = require('./erc20-contract');
const DriipSettlementChallengeContract = require('./driip-settlement-challenge-contract');
const ExchangeContract = require('./exchange-contract');

const _clientFund = new WeakMap();
const _driipSettlementChallengeContract = new WeakMap();
const _exchangeContract = new WeakMap();

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
        _driipSettlementChallengeContract.set(this, new DriipSettlementChallengeContract(this));
        _exchangeContract.set(this, new ExchangeContract(this));
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
        return getTransactionReceipt.call(this, tx.hash);
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
            throw new Error('Failed to approve ERC20 token payment in time!');
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
            throw new Error('Failed to deposit token in time!');
        }

        if (depositTxReceipt.status === 0)
            throw new Error('Deposit transaction failed!');

        return [approvalTxReceipt, depositTxReceipt];
    }

    /**
     * Start a payment challenge period for a receipt
     * @param {Receipt} receipt - The receipt object for payment challenge.
     * @param {string} stageAmount - The amount to stage from the settled balance during the settlement.
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     * @example
     * let hashObj = await wallet.startChallengeFromPayment(receipt, '1.1', {gasLimit: 200000});
     */
    async startChallengeFromPayment(receipt, stageAmount, options = {}) {
        let amountBN = ethers.utils.parseEther(stageAmount);
        const receiptJSON = receipt.toJSON();
        if (receiptJSON.currency.ct !== '0x0000000000000000000000000000000000000000') {
            const tokenInfo = await getTokenInfo.call(this, receiptJSON.currency.ct, true);
            amountBN = ethers.utils.parseUnits(stageAmount.toString(), tokenInfo.decimals);
        }
        
        const challengeContract = _driipSettlementChallengeContract.get(this);
        return await challengeContract.startChallengeFromPayment(receipt.toJSON(), this.address, amountBN, options);
    }

    /**
     * Settle a payment driip of this wallet.
     * @param {Receipt} receipt - The receipt object for payment challenge.
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     * @example
     * let hashObj = await wallet.settleDriipAsPayment(receipt, {gasLimit: 200000});
     */
    async settleDriipAsPayment(receipt, options = {}) {
        const exchangeContract = _exchangeContract.get(this);
        return await exchangeContract.settleDriipAsPayment(receipt.toJSON(), this.address, options);
    }

    /**
     * Without an amount of ETH from nahmii to base layer.
     * @param {string} amountEth - The amount of ETH to withdraw from nahmii.
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     * @example
     * let hashObj = await wallet.withdrawEth('1.1', {gasLimit: 200000});
     */
    async withdrawEth(amountEth, options = {}) {
        const currency = '0x0000000000000000000000000000000000000000';
        const amountWei = ethers.utils.parseEther(amountEth.toString());
        const clientFund = _clientFund.get(this);
        return await clientFund.withdraw(amountWei, currency, 0, '', options);
    }

    /**
     * Without an amount of ETH from nahmii to base layer.
     * @param {string} amount - The amount of ETH to withdraw from nahmii.
     * @param {string} symbol - The token symbol to withdraw.
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     * @example
     * let hashObj = await wallet.withdrawToken('1.1', 'TT1', {gasLimit: 200000});
     */
    async withdrawToken(amount, symbol, options = {}) {
        const tokenInfo = await getTokenInfo.call(this, symbol);
        const amountBN = ethers.utils.parseUnits(amount.toString(), tokenInfo.decimals);

        const clientFund = _clientFund.get(this);
        return await clientFund.withdraw(amountBN, tokenInfo.currency, 0, '', options);
    }

    /**
     * Unstage an amount of ETH from staged balance back to nahmii available balance.
     * @param {string} amount - The amount of ETH to unstage from staged balance.
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     * @example
     * let hashObj = await wallet.unstageEth('1.1', {gasLimit: 200000});
     */
    async unstageEth(amount, options = {}) {
        const currency = '0x0000000000000000000000000000000000000000';
        const amountWei = ethers.utils.parseEther(amount.toString());
        const clientFund = _clientFund.get(this);
        return await clientFund.unstage(amountWei, currency, 0, options);
    }

    /**
     * Unstage an amount of ERC20 token from staged balance back to nahmii available balance.
     * @param {string} amount - The amount of ERC20 token from staged balance to unstage balance(available balance).
     * @param {string} symbol - The token symbol to unstage.
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     * @example
     * let hashObj = await wallet.unstageToken('1.1', 'TT1', {gasLimit: 200000});
     */
    async unstageToken(amount, symbol, options = {}) {
        const tokenInfo = await getTokenInfo.call(this, symbol);
        const amountBN = ethers.utils.parseUnits(amount.toString(), tokenInfo.decimals);

        const clientFund = _clientFund.get(this);
        return await clientFund.unstage(amountBN, tokenInfo.currency, 0, options);
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
        return deferredIsNotNull(this.provider.getTransactionReceipt(transactionHash));
    }, 60, 1000).then(result => {
        process.stderr.write('\n');
        return result;
    });
}

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
                        attempt();
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
        });
    });
}
