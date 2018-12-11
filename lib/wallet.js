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
     * Initiates the deposit of ETH from the on-chain balance of the wallet to nahmii.
     * @param {(number|string)} amountEth - The amount of ETH to deposit.
     * @param [options]
     * @return {Promise} A promise that resolves into a transaction with a hash.
     * @example
     * const {hash} = await wallet.depositEth('1.1', {gasLimit: 200000});
     * const receipt = await wallet.provider.getTransactionConfirmation(hash);
     */
    depositEth(amountEth, options) {
        options = { gasLimit: 600000, ...options };
        const amountWei = ethers.utils.parseEther(amountEth.toString());
        const clientFund = _clientFund.get(this);
        const rawTx = {
            to: clientFund.address,
            value: amountWei,
            ...options
        };
        dbg('Sending ' + amountWei + ' wei to ' + clientFund.address + ' from ' + this.address);
        return this.sendTransaction(rawTx);
    }
    
    /**
     * Initiates the deposit of a token from the wallet's on-chain balance to nahmii by calling the 
     * approve method of the token smart contract.
     * @param {(number|string)} amount - The amount of currency to deposit.
     * @param {string} symbol - The currency symbol
     * @param [options]
     * @returns {Promise} A promise that resolves into a transaction with a hash.
     * @see https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-receipts
     * @example
     * const {hash} = await wallet.depositToken('1.1', 'HBT', {gasLimit: 200000});
     * const receipt = await wallet.provider.getTransactionConfirmation(hash);
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
     * @returns {Promise} A promise that resolves into a transaction with a hash.
     * @example
     * const {hash} = await wallet.completeTokenDepsoit('1.1', 'HBT', {gasLimit: 200000});
     * const receipt = await wallet.provider.getTransactionConfirmation(hash);
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
