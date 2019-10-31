'use strict';
const MonetaryAmount = require('../monetary-amount');
const SettlementBase = require('./settlement');
const NullSettlementContract = require('./null-settlement-contract');
const NullSettlementChallengeContract = require('./null-settlement-challenge-contract');
const NestedError = require('../nested-error');

const _expirationTime = new WeakMap();
const _hasExpired = new WeakMap();
const _status = new WeakMap();
const _hasTerminated = new WeakMap();
const _nullSettlementChallengeContract = new WeakMap();
const _nullSettlementContract = new WeakMap();

/**
 * @class OnchainBalanceSettlement
 * A class for managing a settlement based on ClientFund's active balance.
 * @alias module:nahmii-sdk
 * @example
 * const nahmii = require('nahmii-sdk');
 * const {EthereumAddress} = require('nahmii-ethereum-address');
 * const wallet_address = EthereumAddress.from('0x0000000000000000000000000000000000000001');
 * const stageAmount = ethers.utils.bigNumberify(1);
 * const monetaryAmount = MonetaryAmount.from({
 *      currency: {ct: '0x0000000000000000000000000000000000000002': id: '0'},
 *      amount: stageAmount
 * });
 * const paymentSettlement = new nahmii.PaymentSettlement(wallet_address, monetaryAmount, provider);
 *
 */
class OnchainBalanceSettlement extends SettlementBase {
    /**
     * Constructor
     * Creates a new settlement for an intended stage amount without an off-chain receipt.
     * @param {EthereumAddress} address - Wallet address
     * @param {MonetaryAmount} monetaryAmount - Intended stage amount in a currency
     * @param {NahmiiProvider} provider - A NahmiiProvider instance
     */
    constructor(address, monetaryAmount, provider) {
        super(address, monetaryAmount, provider);
        _nullSettlementContract.set(this, new NullSettlementContract(this.provider));
        _nullSettlementChallengeContract.set(this, new NullSettlementChallengeContract(this.provider));
    }
    /**
     * This settlement's type
     * @returns {string}
     */
    get type() {
        return 'onchain-balance';
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
        return (this.isOngoing || this.status || this.isCompleted) ? true : false;
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
        return this.isTerminated;
    }
    /**
     * Indicates if this settlement is ongoing
     * @returns {boolean}
     */
    get isOngoing() {
        const hasExpired = _hasExpired.get(this);
        return hasExpired === false;
    }
    /**
     * Indicates if this settlement is ready to be staged
     * @returns {boolean}
     */
    get isStageable() {
        return this.status === 'Qualified' && !this.isOngoing && !this.isCompleted;
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
            const contract = new NullSettlementChallengeContract(this.provider);
            const data = contract.interface.functions['startChallenge'].encode([
                this.stageAmount, 
                this.currency.ct.toString(), 
                this.currency.id
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
            const registeredEvent = await this.provider.registerSettlement(signedTransaction);

            return registeredEvent;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to start a continuous settlement.');
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
            
            const nullSettlementContract = new NullSettlementContract(wallet);
            const tx = await nullSettlementContract.settleNull(
                this.currency.ct.toString(), 
                this.currency.id, 
                'ERC20', 
                options
            );
            return tx;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to stage a continuous settlement.');
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
        const contract = new NullSettlementChallengeContract(provider);
        const stageAmount = await contract.getCurrentProposalStageAmount(address, currency.ct, 0);
        if (!stageAmount) 
            return null;

        const monetaryAmount = MonetaryAmount.from({
            currency,
            amount: stageAmount
        });
        const currentSettlement = new OnchainBalanceSettlement(address, monetaryAmount, provider);
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
        const currentSettlement = await OnchainBalanceSettlement.load(address, monetaryAmount.currency, provider);
        if (currentSettlement && currentSettlement.isStarted && !currentSettlement.isCompleted) 
            throw new Error('Can not create new settlement object because the last settlement has not completed yet.');
        
        const newSettlement = new OnchainBalanceSettlement(address, monetaryAmount, provider);
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
        const currentSettlement = await OnchainBalanceSettlement.load(address, currency, provider);
        if (currentSettlement && !currentSettlement.isCompleted) 
            return {canStart: false, currentSettlement};
        return {canStart: true};
    }
    /**
     * Converts this settlement into a JSON object
     * @returns {JSON} A JSON object that is in the format the API expects
     */
    toJSON() {
        return {
            ...super.toJSON(),
            type: this.type,
            status: this.status,
            isStarted: this.isStarted,
            isOngoing: this.isOngoing,
            isStageable: this.isStageable,
            isTerminated: this.isTerminated,
            isCompleted: this.isCompleted,
            expirationTime: this.expirationTime
        };
    }
}

async function sync() {
    const nullSettlementChallengeContract = _nullSettlementChallengeContract.get(this);

    const [hasExpired, expirationTime, hasTerminated, status] = await Promise.all([
        nullSettlementChallengeContract.hasCurrentProposalExpired(this.address, this.currency.ct, this.currency.id),
        nullSettlementChallengeContract.getCurrentProposalExpirationTime(this.address, this.currency.ct, this.currency.id),
        nullSettlementChallengeContract.hasCurrentProposalTerminated(this.address, this.currency.ct, this.currency.id),
        nullSettlementChallengeContract.getCurrentProposalStatus(this.address, this.currency.ct, this.currency.id)
    ]);

    _status.set(this, status);
    _expirationTime.set(this, expirationTime);
    _hasExpired.set(this, hasExpired);
    _hasTerminated.set(this, hasTerminated);
}

module.exports = OnchainBalanceSettlement;