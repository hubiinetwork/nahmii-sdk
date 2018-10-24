'use strict';

/**
 * @module nahmii-sdk
 */

const dbg = require('./dbg');
const ethers = require('ethers');
const { SigningKey } = require('ethers/utils');
const ClientFundContract = require('./client-fund-contract');
const Erc20Contract = require('./erc20-contract');

const _clientFund = new WeakMap();

/**
 * @class Wallet
 * A class for performing various operations on a wallet.
 * @alias module:nahmii-sdk
 */
class Wallet extends ethers.Signer {
    /**
     * Create a Wallet from either a private key or custom signing functions
     * @param {(string|object)} signer - A private key, or information required for the wallet to have signing capabilities
     * @param {NahmiiProvider} provider - A NahmiiProvider instance
     */
    constructor(signer, provider) {
        super();
        this.provider = provider;

        if (typeof signer === 'string') 
            initializeFromPrivateKey(this, signer);
        else 
            initializeFromCustomParams(this, signer.signMessage, signer.signTransaction, signer.address);

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
        const rawTx = {
            to: clientFund.address,
            value: amountWei,
            ...options
        };
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
      * Returns the wallet instance address
      */
    getAddress() {
        return ethers.Wallet.prototype.getAddress.call(this);
    }

    /**
      * Returns the wallet instance on-chain ETH balance
      * @param {string} [blockTag] - A block number to calculate from
      */
    getBalance(blockTag) {
        return ethers.Wallet.prototype.getBalance.call(this, blockTag);
    }

    /**
      * Returns the wallet instance on-chain transaction count
      * @param {string} [blockTag] - A block number to calculate from
      */
    getTransactionCount(blockTag) {
        return ethers.Wallet.prototype.getTransactionCount.call(this, blockTag);
    }

    /**
      * Signs and broadcasts an Ethereum transaction to the network
      * @param {object} transaction - An unsigned Ethereum transaction
      */
    sendTransaction(transaction) {
        return ethers.Wallet.prototype.sendTransaction.call(this, transaction);
    }
}

module.exports = Wallet;

/**
  * @private - invoke bound to instance.
  * Creates signing methods and derives an address from a private key and assigns them to this Wallet instance
  * @param {Wallet} wallet - A wallet instance to be initialized
  * @param {string} privateKey - An Ethereum hex encoded private key
  */
function initializeFromPrivateKey(wallet, privateKey) {
    const ethersWallet = new ethers.Wallet(privateKey, wallet.provider);
    wallet.signingKey = new SigningKey(privateKey);
    wallet.address = ethersWallet.address;
    wallet.signMessage = ethersWallet.signMessage.bind(wallet);
    wallet.sign = ethersWallet.sign.bind(wallet);
}

/**
 * @private - invoke bound to instance.
 * Creates signing methods and derives an address from custom parameters and assigns them to this Wallet instance
 * @param {Wallet} wallet - A wallet instance to be initialized
 * @param {function} signMessage - Takes a string as input and returns a flat format Ethereum signature
 * @param {function} signTransaction - Takes a transaction as input and returns the same transaction signed, as a hex string
 * @param {string} address - The address to use. Must be able to derive from the private key used in the signing functions
 */
function initializeFromCustomParams(wallet, signMessage, signTransaction, address) {
    if 
    (
        typeof signMessage !== 'function' 
        || typeof signTransaction !== 'function'
        || typeof address !== 'string'
    ) throw new Error('Invalid param passed to Wallet constructor');
    wallet.signMessage = signMessage;
    wallet.address = address;
    wallet.sign = signTransaction;
}

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
