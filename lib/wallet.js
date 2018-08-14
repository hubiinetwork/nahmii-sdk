'use strict';

const ethers = require('ethers');
//const {getStriimBalances} = require('./balances-model');
const ClientFundContract = require('./client-fund-contract');
const Erc20Contract = require('./erc20-contract');

const _clientFund = new WeakMap();

class Wallet extends ethers.Wallet {
    constructor(privateKey, provider) {
        super(privateKey, provider);
        _clientFund.set(this, new ClientFundContract(this));
    }

    /**
     * Retrieves striim balance for current wallet.
     * @returns {Promise<Object>} A promise that resolves into a mapping from symbol to human readable amount.
     */
    async getStriimBalance() {
        const apiAccessToken = await getApiAccessToken.call(this);
        const [striimBalances, supportedTokens] = await Promise.all([
            this.provider.getStriimBalances(this.address),
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

        const striimBalance = {};
        for (let b of striimBalances) {
            const currency = currencies.get(b.currency.toUpperCase());
            striimBalance[currency.symbol] =
                ethers.utils.formatUnits(b.amount, currency.decimals);
        }

        return striimBalance;
    }

    /**
     * Deposits ETH from the on-chain balance of the wallet to striim.
     * @see https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-receipts
     * @param {(number|string)} amountEth The amount of ETH to deposit.
     * @param [options]
     * @returns {Promise<Object>} A promise that resolves into a transaction receipt.
     */
    async depositEth(amountEth, options) {
        const amountWei = ethers.utils.parseEther(amountEth.toString());
        const clientFund = _clientFund.get(this);
        dbg('Sending ' + amountWei + ' wei to ' + clientFund.address + ' from ' + this.address);
        const tx = await this.send(clientFund.address, amountWei, options);
        return getTransactionReceipt.call(this, tx.hash);
    }

    /**
     * Deposits a token from the on-chain balance of the wallet to striim.
     * @see https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-receipts
     * @param {(number|string)} amount The amount of currency to deposit.
     * @param {string} symbol The currency symbol
     * @param [options]
     * @returns {Promise<Object[]>} A promise that resolves into an array of transaction receipts.
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
            var depositTx = await clientFund.depositTokens(tokenContract.address, amountBN, options);
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
 * Private method - invoke bound to instance.
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
 * Private method - invoke bound to instance.
 * Retrieves information about the token that has the specified symbol.
 * @param {string} symbol
 * @returns {Promise<Object>}
 */
async function getTokenInfo(symbol) {
    const supportedTokens = await this.provider.getSupportedTokens();
    const tokenInfo = supportedTokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
    if (!tokenInfo)
        throw new Error('Unknown currency. See "striim show tokens" for a list of supported tokens.');
    return tokenInfo;
}

/**
 * Private method - invoke bound to instance.
 * Retrieves the API access token for striim APIs.
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
