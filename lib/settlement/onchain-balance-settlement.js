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

class OnchainBalanceSettlement extends SettlementBase {
    constructor(address, monetaryAmount, provider) {
        super(address, monetaryAmount, provider);
        _nullSettlementContract.set(this, new NullSettlementContract(this.provider));
        _nullSettlementChallengeContract.set(this, new NullSettlementChallengeContract(this.provider));
    }
    get type() {
        return 'onchain-balance';
    }
    get status() {
        return _status.get(this);
    }
    get isStarted() {
        return (this.isOngoing || this.status || this.isCompleted) ? true : false;
    }
    get isTerminated() {
        return !!_hasTerminated.get(this);
    }
    get isCompleted() {
        return this.isTerminated;
    }
    get isOngoing() {
        const hasExpired = _hasExpired.get(this);
        return hasExpired === false;
    }
    get isStageable() {
        return this.status === 'Qualified' && !this.isOngoing && !this.isCompleted;
    }
    get expirationTime () {
        const expirationTime = _expirationTime.get(this);
        if (expirationTime) 
            return expirationTime.toNumber() * 1000;
        
        return null;
    }
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
    static async create(address, monetaryAmount, provider) {
        const currentSettlement = await OnchainBalanceSettlement.load(address, monetaryAmount.currency, provider);
        if (currentSettlement && currentSettlement.isStarted && !currentSettlement.isCompleted) 
            throw new Error('Can not create new settlement object because the last settlement has not completed yet.');
        
        const newSettlement = new OnchainBalanceSettlement(address, monetaryAmount, provider);
        return newSettlement;
    }
    static async checkForCreate(address, currency, provider) {
        const currentSettlement = await OnchainBalanceSettlement.load(address, currency, provider);
        if (currentSettlement && !currentSettlement.isCompleted) 
            return {canStart: false, currentSettlement};
        return {canStart: true};
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