'use strict';
const {EthereumAddress} = require('nahmii-ethereum-address');
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
    constructor(address, ct, stageAmount, provider) {
        super(address, ct, stageAmount, provider);
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
    get isCompleted() {
        return _hasTerminated.get(this) ? true : false;
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
                this.currency.toString(), 
                0
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
            const tx = await nullSettlementContract.settleNull(this.currency.toString(), 0, 'ERC20', options);
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
            isCompleted: this.isCompleted,
            expirationTime: this.expirationTime
        };
    }
    static async load(address, ct, provider) {
        const walletAddress = EthereumAddress.from(address);
        const currencyAddress = EthereumAddress.from(ct);

        const contract = new NullSettlementChallengeContract(provider);
        const stageAmount = await contract.getCurrentProposalStageAmount(walletAddress.toString(), currencyAddress.toString(), 0);
        if (!stageAmount) 
            return null;

        const currentSettlement = new OnchainBalanceSettlement(walletAddress, currencyAddress, stageAmount, provider);
        await sync.call(currentSettlement);
        return currentSettlement;
    }
    static async create(address, ct, stageAmount, provider) {
        const walletAddress = EthereumAddress.from(address);
        const currencyAddress = EthereumAddress.from(ct);

        const currentSettlement = await OnchainBalanceSettlement.load(walletAddress, currencyAddress, provider);
        if (currentSettlement && currentSettlement.isStarted && !currentSettlement.isCompleted) 
            throw new Error('Can not create new settlement object because the last settlement has not completed yet.');
        
        const newSettlement = new OnchainBalanceSettlement(walletAddress, currencyAddress, stageAmount, provider);
        return newSettlement;
    }
    static async checkForCreate(address, ct, provider) {
        const currentSettlement = await OnchainBalanceSettlement.load(address, ct, provider);
        if (currentSettlement && !currentSettlement.isCompleted) 
            return {canStart: false, currentSettlement};
        return {canStart: true};
    }
}

async function sync() {
    const nullSettlementChallengeContract = _nullSettlementChallengeContract.get(this);

    const {address, currency} = this.toJSON();
    const [hasExpired, expirationTime, hasTerminated, status] = await Promise.all([
        nullSettlementChallengeContract.hasCurrentProposalExpired(address, currency, 0),
        nullSettlementChallengeContract.getCurrentProposalExpirationTime(address, currency, 0),
        nullSettlementChallengeContract.hasCurrentProposalTerminated(address, currency, 0),
        nullSettlementChallengeContract.getCurrentProposalStatus(address, currency, 0)
    ]);

    _status.set(this, status);
    _expirationTime.set(this, expirationTime);
    _hasExpired.set(this, hasExpired);
    _hasTerminated.set(this, hasTerminated);
}

module.exports = OnchainBalanceSettlement;