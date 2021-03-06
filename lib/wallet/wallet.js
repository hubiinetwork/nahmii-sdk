'use strict';

/**
 * @module nahmii-sdk
 */

const dbg = require('../dbg');
const ethers = require('ethers');
const ClientFundContract = require('./client-fund-contract');
const BalanceTrackerContract = require('./balance-tracker-contract');
const Erc20Contract = require('../erc20/erc20-contract');

const _clientFund = new WeakMap();
const _balanceTracker = new WeakMap();
const _provider = new WeakMap();
const _signatureProvider = new WeakMap();

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
        _provider.set(this, provider);

        if (typeof signer === 'string')
            _signatureProvider.set(this, signerFromKey.call(this, signer));
        else
            _signatureProvider.set(this, signerFromExternalImpl.call(this, signer.signMessage, signer.signTransaction, signer.address));
    }

    /**
     * The Nahmii Provider used by this wallet instance.
     * @return {NahmiiProvider}
     */
    get provider() {
        return _provider.get(this);
    }

    /**
     * Returns the address for this wallet, required by ethers Wallet methods.
     * @return {String}
     */
    get address() {
        return _signatureProvider.get(this).address;
    }

    /**
     * Retrieves available nahmii balance for current wallet.
     * @return {Promise} A promise that resolves into a mapping from symbol to human readable amount.
     */
    async getNahmiiBalance() {
        const address = await this.getAddress();
        const [nahmiiBalances, supportedTokens] = await Promise.all([
            this.provider.getNahmiiBalances(address),
            this.provider.getSupportedTokens()
        ]);

        const currencies = new Map();
        currencies.set('0X0000000000000000000000000000000000000000', {
            symbol: 'ETH',
            decimals: 18
        });
        for (const t of supportedTokens) {
            currencies.set(t.currency.toUpperCase(), {
                symbol: t.symbol,
                decimals: t.decimals
            });
        }

        const nahmiiBalance = {};
        for (const b of nahmiiBalances) {
            const currency = currencies.get(b.currency.ct.toUpperCase());
            const symbol = currency ? currency.symbol : b.currency.ct.toUpperCase();
            nahmiiBalance[symbol] = currency ? ethers.utils.formatUnits(b.amountAvailable, currency.decimals) : b.amountAvailable;
        }

        return nahmiiBalance;
    }

    /**
     * Retrieves nahmii staged balance for a currency of the current wallet.
     * @param {string} symbol - The currency symbol
     * @return {Promise<BigNumber>}
     */
    async getNahmiiStagedBalance(symbol) {
        const balanceTracker = acquireBalanceTrackerContract.call(this);
        const balanceType = await balanceTracker.stagedBalanceType();
        const tokenInfo = await this.provider.getTokenInfo(symbol);
        const stagedBalance = await balanceTracker.get(
            this.address, balanceType, tokenInfo.currency, 0
        );
        return stagedBalance;
    }

    /**
     * Retrieves all receipts for effectuated payments for the wallet using
     * filter/pagination criteria.
     * @param {number} [fromNonce] Filter payment receipts greater or equal to specific nonce.
     * @param {number} [limit] The max number of payment receipts to return.
     * @param {boolean} [asc=false] Return payment receipts in asc order.
     * @returns {Promise} A promise that resolves into an array of payment receipts
     */
    async getReceipts(fromNonce, limit, asc) {
        return this.provider.getWalletReceipts(this.address, fromNonce, limit, asc);
    }

    /**
     * Initiates the deposit of ETH from the on-chain balance of the wallet to
     * nahmii.
     * @param {(number|string)} amountEth - The amount of ETH to deposit.
     * @param [options]
     * @return {Promise} A promise that resolves into a transaction with a hash.
     * @example
     * const {hash} = await wallet.depositEth('1.1', {gasLimit: 200000});
     * const receipt = await wallet.provider.getTransactionConfirmation(hash);
     */
    async depositEth(amountEth, options) {
        options = {gasLimit: 600000, ...options};
        const amountWei = ethers.utils.parseEther(amountEth.toString());
        const clientFund = acquireClientFundContract.call(this);
        const rawTx = {
            to: clientFund.address,
            value: amountWei,
            ...options
        };

        const address = await this.getAddress();
        dbg('Sending ' + amountWei + ' wei to ' + clientFund.address + ' from ' + address);
        return this.sendTransaction(rawTx);
    }

    /**
     * Retrieve current deposit allowance for the specified symbol.
     * @param {string} symbol - The currency symbol
     * @returns {Promise<BigNumber>}
     */
    async getDepositAllowance(symbol) {
        const contract = await Erc20Contract.from(symbol, this);
        return contract.allowance(this.address, acquireClientFundContract.call(this).address);
    }

    /**
     * Initiates the deposit of a token from the wallet's on-chain balance to
     * nahmii by calling the approve method of the token smart contract.
     * @param {(number|string)} amount - The amount of currency to deposit.
     * @param {string} symbol - The currency symbol
     * @param [options]
     * @return {Promise} A promise that resolves into a transaction with a hash.
     * @see https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-receipts
     * @example
     * const {hash} = await wallet.depositToken('1.1', 'HBT', {gasLimit: 200000});
     * const receipt = await wallet.provider.getTransactionConfirmation(hash);
     */
    async approveTokenDeposit(amount, symbol, options) {
        options = {gasLimit: 600000, ...options};
        const contract = await Erc20Contract.from(symbol, this);
        const amountBN = contract.parse(amount.toString());
        const clientFund = acquireClientFundContract.call(this);
        try {
            return await contract.approve(clientFund.address, amountBN, options);
        }
        catch (e) {
            throw new Error(`Failed to approve token deposit: ${e}`);
        }
    }

    /**
     * Initiates the completion of a deposit of a token from a wallet's on-chain
     * balance to nahmii by calling the depositTokens method of the nahmii
     * clientFund smart contract.
     * Requires approveTokenDeposit to have been called first.
     * @param {(number|string)} amount - The amount of currency to deposit.
     * @param {string} symbol - The currency symbol
     * @param [options]
     * @return {Promise} A promise that resolves into a transaction with a hash.
     * @example
     * const {hash} = await wallet.completeTokenDepsoit('1.1', 'HBT', {gasLimit: 200000});
     * const receipt = await wallet.provider.getTransactionConfirmation(hash);
     */
    async completeTokenDeposit(amount, symbol, options) {
        options = {gasLimit: 600000, ...options};
        const contract = await Erc20Contract.from(symbol, this);
        const amountBN = contract.parse(amount.toString());
        const clientFund = acquireClientFundContract.call(this);

        try {
            return await clientFund.receiveTokens('', amountBN, contract.address, 0, 'ERC20', options);
        }
        catch (e) {
            throw new Error(`Failed to complete token deposit: ${e}`);
        }
    }

    /**
     * Withdraw an amount of ETH or ERC20 tokens from nahmii to base layer.
     * @param {MonetaryAmount} monetaryAmount - The amount to withdraw from nahmii.
     * @param [options]
     * @return {Promise} A promise that resolves into transaction hash.
     * @example
     * let amountBN = ethers.utils.parseUnits('1.1', 18);
     * let currency = '0x0000000000000000000000000000000000000000'
     * let monetaryAmount = new nahmii.MonetaryAmount(amountBN, currency, 0)
     * let hashObj = await wallet.withdraw(monetaryAmount, {gasLimit: 200000});
     */
    async withdraw(monetaryAmount, options = {}) {
        const {amount, currency} = monetaryAmount.toJSON();
        const clientFund = acquireClientFundContract.call(this);
        return await clientFund.withdraw(amount, currency.ct, currency.id, 'ERC20', options);
    }

    /**
     * Unstage an amount of ETH or ERC20 tokens from staged balance back to
     * nahmii available balance.
     * @param {MonetaryAmount} monetaryAmount - The amount unstage from staged balance.
     * @param [options]
     * @return {Promise} A promise that resolves into transaction hash.
     * @example
     * let amountBN = ethers.utils.parseUnits('1.1', 18);
     * let currency = '0x0000000000000000000000000000000000000000'
     * let monetaryAmount = new nahmii.MonetaryAmount(amountBN, currency, 0)
     * let hashObj = await wallet.unstage(monetaryAmount, {gasLimit: 200000});
     */
    async unstage(monetaryAmount, options = {}) {
        const {amount, currency} = monetaryAmount.toJSON();
        const clientFund = acquireClientFundContract.call(this);
        return await clientFund.unstage(amount, currency.ct, currency.id, 'ERC20', options);
    }

    /**
     * Retrieves the wallet address.
     * @return {Promise<string>} - The wallet address as a hexadecimal string
     */
    async getAddress() {
        return _signatureProvider.get(this).address;
    }

    /**
     * Signs message and returns a Promise that resolves to the flat-format
     * signature. If message is a string, it is converted to UTF-8 bytes,
     * otherwise it is preserved as a binary representation of the Arrayish data.
     * @param message
     * @return {Promise<string>}
     */
    async signMessage(message) {
        return await _signatureProvider.get(this).signMessage(message);
    }

    /**
     * Signs transaction and returns a Promise that resolves to the signed
     * transaction as a hex string.
     * In general, the sendTransaction method is preferred to sign, as it can
     * automatically populate values asynchronously.
     * @param transaction
     * @return {Promise<string>}
     */
    async sign(transaction) {
        return await _signatureProvider.get(this).sign(transaction);
    }

    /**
     * Returns the wallet instance on-chain ETH balance
     * @param {string} [blockTag] - A block number to calculate from
     * @return {Promise<BigNumber>}
     */
    async getBalance(blockTag) {
        return await ethers.Wallet.prototype.getBalance.call(this, blockTag);
    }

    /**
     * Returns the wallet instance on-chain transaction count
     * @param {string} [blockTag] - A block number to calculate from
     * @return {Promise<number>}
     */
    async getTransactionCount(blockTag) {
        return await ethers.Wallet.prototype.getTransactionCount.call(this, blockTag);
    }

    /**
     * Sends the transaction to the network and returns a Promise that resolves
     * to a Transaction Response.
     * Any properties that are not provided will be populated from the network.
     * See: https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-request
     * @param {object} transaction - An unsigned Ethereum transaction
     * @return {Promise<TransactionResponse>}
     */
    async sendTransaction(transaction) {
        return await ethers.Wallet.prototype.sendTransaction.call(this, transaction);
    }

    /**
     * If used with software wallet, returns an object containing signer related
     * information and logic such as the private key, otherwise undefined
     * @returns {ethers.SignerKey|undefined} The private key or undefined
     */
    get signerKey() {
        return _signatureProvider.get(this).signerKey;
    }
}

module.exports = Wallet;

/**
 * @private - invoke bound to instance.
 * Creates signer implementation
 * @param {string} privateKey - An Ethereum hex encoded private key
 * @return {object} implementing the functions needed to sign a message
 */
function signerFromKey(privateKey) {
    return new ethers.Wallet(privateKey, this.provider);
}

/**
 * @private - invoke bound to instance.
 * Creates custom signer implementation
 * @param {function} signMessage - Takes a string as input and returns a flat format Ethereum signature
 * @param {function} sign - Takes a transaction as input and returns the same transaction signed, as a hex string
 * @param {string} address - The address to use. Must be able to derive from the private key used in the signing functions
 */
function signerFromExternalImpl(signMessage, sign, address) {
    if (typeof signMessage === 'function'
        && typeof sign === 'function'
        && typeof address === 'string'
    )
        return {signMessage, sign, address};

    throw new Error('Invalid parameter passed to Wallet constructor');
}

/**
 * @private - invoke bound to instance.
 * Lazily instantiates client fund contract on first invocation.
 * @returns {ClientFundContract} instance of client fund contract.
 */
function acquireClientFundContract() {
    let contract = _clientFund.get(this);
    if (!contract) {
        contract = new ClientFundContract(this);
        _clientFund.set(this, contract);
    }
    return contract;
}

/**
 * @private - invoke bound to instance.
 * Lazily instantiates balance tracked contract on first invocation.
 * @returns {BalanceTrackerContract} instance of balance tracker contract.
 */
function acquireBalanceTrackerContract() {
    let contract = _balanceTracker.get(this);
    if (!contract) {
        contract = new BalanceTrackerContract(this);
        _balanceTracker.set(this, contract);
    }
    return contract;
}
