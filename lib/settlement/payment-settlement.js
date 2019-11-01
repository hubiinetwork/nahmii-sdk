'use strict';
const {EthereumAddress} = require('nahmii-ethereum-address');
const MonetaryAmount = require('../monetary-amount');
const SettlementBase = require('./settlement');
const DriipSettlementContract = require('./driip-settlement-contract');
const DriipSettlementChallengeContract = require('./driip-settlement-challenge-contract');
const NestedError = require('../nested-error');
const {determineNonceFromReceipt, determineBalanceFromReceipt} = require('./utils');

const _expirationTime = new WeakMap();
const _hasExpired = new WeakMap();
const _hasTerminated = new WeakMap();
const _status = new WeakMap();
const _receipt = new WeakMap();
const _settlementHistory = new WeakMap();
const _driipSettlementChallengeContract = new WeakMap();
const _driipSettlementContract = new WeakMap();

/**
 * @class PaymentSettlement
 * A class for managing a settlement in payment driip type.
 * @alias module:nahmii-sdk
 * @example
 * const {EthereumAddress} = require('nahmii-ethereum-address');
 * const nahmii = require('nahmii-sdk');
 * const wallet_address = EthereumAddress.from('0x0000000000000000000000000000000000000001');
 * const stageAmount = ethers.utils.bigNumberify(1);
 * const paymentSettlement = new nahmii.PaymentSettlement(wallet_address, receipt, stageAmount, provider);
 *
 */
class PaymentSettlement extends SettlementBase {
    /**
     * Constructor
     * Creates a new settlement with an payment receipt for an intended stage amount.
     * @param {EthereumAddress} address - Wallet address
     * @param {Receipt} receipt - Senders address
     * @param {BigNumber} stageAmount - Intended stage amount in BigNumber
     * @param {NahmiiProvider} provider - A NahmiiProvider instance
     */
    constructor(address, receipt, stageAmount, provider) {
        const monetaryAmount = MonetaryAmount.from({
            currency: receipt.currency,
            amount: stageAmount
        });
        super(address, monetaryAmount, provider);

        _receipt.set(this, receipt);
        _driipSettlementContract.set(this, new DriipSettlementContract(this.provider));
        _driipSettlementChallengeContract.set(this, new DriipSettlementChallengeContract(this.provider));
    }
    /**
     * This settlement's type
     * @returns {string}
     */
    get type() {
        return 'payment';
    }
    /**
     * The receipt this settlement bases on
     * @returns {Receipt}
     */
    get receipt() {
        return _receipt.get(this);
    }
    /**
     * The wallet's nonce used for starting this settlement
     * @returns {number}
     */
    get walletNonce() {
        const nonce = determineNonceFromReceipt(this.receipt, this.address);
        return nonce;
    }
    /**
     * This settlement's status. Either ['Qualified', 'Disqualified']
     * @returns {string}
     */
    get status() {
        return _status.get(this);
    }
    /**
     * Indicates if this settlement has been started
     * @returns {boolean}
     */
    get isStarted() {
        return (this.isOngoing || this.status || this.isCompleted || this.isTerminated) ? true : false;
    }
    /**
     * Indicates if this settlement has been terminated
     * @returns {boolean}
     */
    get isTerminated() {
        return !!_hasTerminated.get(this);
    }
    /**
     * Indicates if this settlement has been completed
     * @returns {boolean}
     */
    get isCompleted() {
        const settlementHistory = _settlementHistory.get(this);

        if (settlementHistory) {
            for(const party of ['origin', 'target']) {
                const partyAddress = EthereumAddress.from(settlementHistory[party].wallet);
                if (!settlementHistory[party].doneBlockNumber.isZero() && this.address.isEqual(partyAddress))
                    return true;
            }
        }

        return false;
    }
    /**
     * Indicates if this settlement is ongoing
     * @returns {boolean}
     */
    get isOngoing() {
        const hasExpired = _hasExpired.get(this);
        return hasExpired === false && !this.isTerminated;
    }
    /**
     * Indicates if this settlement is ready to be staged
     * @returns {boolean}
     */
    get isStageable() {
        return this.status === 'Qualified' && !this.isOngoing && !this.isCompleted && !this.isTerminated;
    }
    /**
     * This settlement's expiration time
     * @returns {boolean}
     */
    get expirationTime () {
        const expirationTime = _expirationTime.get(this);
        if (expirationTime) 
            return expirationTime.toNumber() * 1000;
        
        return null;
    }
    /**
     * Starts this settlement with a wallet
     * @param {Wallet} wallet - A nahmii wallet
     * @param [options] - An optional object containing the parameters for gasLimit and gasPrice
     * @returns {Promise} A promise that resolves into an object that contains the transaction hash.
     */
    async start(wallet, options = {}) {
        try {
            if(this.isStarted) 
                throw new Error('Can not restart a settlement.');

            const nonce = await this.provider.getTransactionCount(wallet.address);
            const contract = new DriipSettlementChallengeContract(this.provider);
            const data = contract.interface.functions['startChallengeFromPayment'].encode([
                this.receipt, 
                this.stageAmount
            ]);
            const transaction = {
                data,
                to: contract.address,
                nonce,
                gasLimit: options.gasLimit,
                gasPrice: options.gasPrice,
                chainId: this.provider.chainId
            };
            const signedTransaction = await wallet.sign(transaction);
            const {data: {parsedRawTransaction}} = await this.provider.registerSettlement(signedTransaction);
            
            return parsedRawTransaction;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to start a payment settlement.');
        }
    }
    /**
     * Stages this settlement with a wallet
     * @param {Wallet} wallet - A nahmii wallet
     * @param [options] - An optional object containing the parameters for gasLimit and gasPrice
     * @returns {Promise} A promise that resolves into an record that contains the transaction hash.
     */
    async stage(wallet, options = {}) {
        try {
            if (!this.isStageable) 
                throw new Error('Not ready to stage the settlement.');
            
            const driipSettlementContract = new DriipSettlementContract(wallet);
            const tx = await driipSettlementContract.settlePayment(this.receipt, 'ERC20', options);
            return tx;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to stage a payment settlement.');
        }
    }
    /**
     * A factory function to load an existing settlement
     * @param {EthereumAddress} address - The ethereum address
     * @param {Currency} currency - The currency
     * @param {NahmiiProvider} provider - A NahmiiProvider instance
     * @returns {Promise} A promise that resolves into a PaymentSettlement instance.
     */
    static async load(address, currency, provider) {
        const contract = new DriipSettlementChallengeContract(provider);
        const [nonce, stageAmount] = await Promise.all([
            contract.getCurrentProposalNonce(address, currency.ct, currency.id),
            contract.getCurrentProposalStageAmount(address, currency.ct, currency.id)
        ]);
        if (!nonce) 
            return null;
        
        const allWalletReceipts = await provider.getWalletReceipts(address.toString());

        const usedReceipt = allWalletReceipts.find(
            r => determineNonceFromReceipt(r, address) === nonce.toNumber()
        );
        const currentSettlement = new PaymentSettlement(address, usedReceipt, stageAmount, provider);
        await sync.call(currentSettlement);
        return currentSettlement;
    }
    /**
     * A factory function to create a new settlement instance before starting it
     * @param {EthereumAddress} address - The ethereum address
     * @param {MonetaryAmount} monetaryAmount - The monetary amount
     * @param {NahmiiProvider} provider - A NahmiiProvider instance
     * @returns {Promise} A promise that resolves into a PaymentSettlement instance.
     */
    static async create(address, monetaryAmount, provider) {
        const {currency, amount} = monetaryAmount;
        const currentSettlement = await PaymentSettlement.load(address, currency, provider);
        if (currentSettlement && !currentSettlement.isCompleted) 
            throw new Error('Can not create new settlement object until the last settlement is completed.');
        
        const latestReceipt = await getLatestReceipt(address, currency.ct, provider);
        const receiptBalance = determineBalanceFromReceipt(latestReceipt, address);
        if (receiptBalance.lt(amount)) 
            throw new Error('The intended stage amount is greater than the receipt balance.');
        
        const newSettlement = new PaymentSettlement(address, latestReceipt, amount, provider);
        return newSettlement;
    }
    /**
     * A factory function to check if a new settlement instance can be created for a wallet/currency pair
     * @param {EthereumAddress} address - The ethereum address
     * @param {Currency} currency - The currency
     * @param {NahmiiProvider} provider - A NahmiiProvider instance
     * @returns {Promise} A promise that resolves into an object {canStart: [boolean], maxStageAmount: [BigNumber], receiptToUse: [Receipt]}.
     */
    static async checkForCreate(address, currency, provider) {
        const latestReceipt = await getLatestReceipt(address, currency.ct, provider);
        if (!latestReceipt) 
            return {canStart: false, receiptToUse: null};

        const currentSettlement = await PaymentSettlement.load(address, currency, provider);
        if (currentSettlement) {
            if (!currentSettlement.isCompleted || JSON.stringify(currentSettlement.receipt) === JSON.stringify(latestReceipt)) 
                return {canStart: false, receiptToUse: null, currentSettlement};
        }

        const maxStageAmount = determineBalanceFromReceipt(latestReceipt, address);
        return {canStart: true, maxStageAmount, receiptToUse: latestReceipt};
    }
    /**
     * Converts this settlement into a JSON object
     * @returns {JSON} A JSON object that is in the format the API expects
     */
    toJSON() {
        return {
            ...super.toJSON(),
            type: this.type,
            receipt: this.receipt,
            status: this.status,
            walletNonce: this.walletNonce,
            isStarted: this.isStarted,
            isOngoing: this.isOngoing,
            isStageable: this.isStageable,
            isCompleted: this.isCompleted,
            isTerminated: this.isTerminated,
            expirationTime: this.expirationTime
        };
    }
}

async function sync() {
    const driipSettlementContract = _driipSettlementContract.get(this);
    const driipSettlementChallengeContract = _driipSettlementChallengeContract.get(this);

    const [expirationTime, status, hasExpired, hasTerminated, settlementHistory] = await Promise.all([
        driipSettlementChallengeContract.getCurrentProposalExpirationTime(this.address, this.currency.ct, this.currency.id),
        driipSettlementChallengeContract.getCurrentProposalStatus(this.address, this.currency.ct, this.currency.id),
        driipSettlementChallengeContract.hasCurrentProposalExpired(this.address, this.currency.ct, this.currency.id),
        driipSettlementChallengeContract.hasCurrentProposalTerminated(this.address, this.currency.ct, this.currency.id),
        driipSettlementContract.getSettlementByNonce(this.address, this.walletNonce)
    ]);

    _status.set(this, status);
    _expirationTime.set(this, expirationTime);
    _hasExpired.set(this, hasExpired);
    _hasTerminated.set(this, hasTerminated);
    _settlementHistory.set(this, settlementHistory);
}

async function getLatestReceipt(address, ct, provider) {
    const receipts = await provider.getWalletReceipts(address.toString(), null, 100);
    const filteredReceipts = receipts
        .filter(r => EthereumAddress.from(r.currency.ct).isEqual(ct))
        .sort((a, b) => determineNonceFromReceipt(b, address) - determineNonceFromReceipt(a, address));
    
    const latestReceipt = filteredReceipts[0];
    return latestReceipt;
}

module.exports = PaymentSettlement;