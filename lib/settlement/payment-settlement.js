'use strict';
const SettlementBase = require('./settlement');
const DriipSettlementContract = require('./driip-settlement-contract');
const DriipSettlementChallengeContract = require('./driip-settlement-challenge-contract');
const NestedError = require('../nested-error');
const {determineNonceFromReceipt, determineBalanceFromReceipt} = require('./utils');
const {caseInsensitiveCompare} = require('../utils');

const _expirationTime = new WeakMap();
const _hasExpired = new WeakMap();
const _status = new WeakMap();
const _lastSettlement = new WeakMap();
const _receipt = new WeakMap();
const _driipSettlementChallengeContract = new WeakMap();
const _driipSettlementContract = new WeakMap();

class PaymentSettlement extends SettlementBase {
    constructor(address, receipt, stageAmount, provider) {
        super(address, receipt.currency.ct, stageAmount, provider);
        _receipt.set(this, receipt);
        _driipSettlementContract.set(this, new DriipSettlementContract(this.provider));
        _driipSettlementChallengeContract.set(this, new DriipSettlementChallengeContract(this.provider));
    }
    get type() {
        return 'payment';
    }
    get receipt() {
        return _receipt.get(this);
    }
    get walletNonce() {
        const nonce = determineNonceFromReceipt(this.receipt, this.address);
        return nonce;
    }
    get status() {
        return _status.get(this);
    }
    get isStarted() {
        return this.isOngoing || this.isQualified || this.isCompleted;
    }
    get isCompleted() {
        const lastSettlement = _lastSettlement.get(this);

        if (lastSettlement) {
            for(const role of ['origin', 'target']) {
                if (lastSettlement[role].done && caseInsensitiveCompare(lastSettlement[role].wallet, this.address))
                    return true;
            }
        }

        return false;
    }
    get isOngoing() {
        return !_hasExpired.get(this);
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
            const contract = new DriipSettlementChallengeContract(wallet);
            const tx = await contract.startChallengeFromPayment(this.receipt, this.stageAmount, options);
            await sync.call(this);
            return tx;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to start a payment settlement.');
        }
    }
    async stage(wallet, options = {}) {
        try {
            const driipSettlementContract = new DriipSettlementContract(wallet);
            const tx = await driipSettlementContract.settlePayment(this.receipt, options);
            await sync.call(this);
            return tx;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to stage a payment settlement.');
        }
    }
    static async load(address, ct, provider) {
        const driipSettlementChallengeContract = new DriipSettlementChallengeContract(provider);
        const [nonce, stageAmount] = await Promise.all([
            driipSettlementChallengeContract.getCurrentProposalNonce(address, ct, 0),
            driipSettlementChallengeContract.getCurrentProposalStageAmount(address, ct, 0)
        ]);
        if (!nonce) 
            return null;
        
        const allWalletReceipts = await provider.getWalletReceipts(address);
        const usedReceipt = allWalletReceipts.find(r => determineNonceFromReceipt(r, address) === nonce.toNumber());
        const currentSettlement = new PaymentSettlement(address, usedReceipt, stageAmount, provider);
        await sync.call(currentSettlement);
        return currentSettlement;
    }
    static async create(address, ct, stageAmount, provider) {
        const currentSettlement = await PaymentSettlement.load(address, ct, provider);
        if (currentSettlement && currentSettlement.isStarted && !currentSettlement.isCompleted) 
            throw new Error('Can not create new settlement object because the last settlement has not completed yet.');
        
        const receipts = await provider.getWalletReceipts(address, null, 100);
        const filteredReceipts = receipts
            .filter(r => caseInsensitiveCompare(r.currency.ct, ct))
            .sort((a, b) => determineNonceFromReceipt(b, address) - determineNonceFromReceipt(a, address));
        if (filteredReceipts.length === 0) 
            throw new Error('No receipt available for starting new payment settlement.');
        
        const latestReceipt = filteredReceipts[0];
        const receiptBalance = determineBalanceFromReceipt(latestReceipt, address);
        if (receiptBalance.lt(stageAmount)) 
            throw new Error('The receipt balance should be greater than or equal to the intended stage amount.');
        
        const newSettlement = new PaymentSettlement(address, latestReceipt, stageAmount, provider);
        return newSettlement;
    }
    toJSON() {
        return {
            type: this.type,
            receipt: this.receipt,
            status: this.status,
            walletNonce: this.walletNonce,
            isStarted: this.isStarted,
            isOngoing: this.isOngoing,
            isStageable: this.isStageable,
            isCompleted: this.isCompleted,
            expirationTime: this.expirationTime
        };
    }
}

async function sync() {
    const driipSettlementContract = _driipSettlementContract.get(this);
    const driipSettlementChallengeContract = _driipSettlementChallengeContract.get(this);

    try {
        const [currentNonce, expirationTime, stageAmount, status, hasExpired, lastSettlement] = await Promise.all([
            driipSettlementChallengeContract.getCurrentProposalNonce(this.address, this.currency, 0),
            driipSettlementChallengeContract.getCurrentProposalExpirationTime(this.address, this.currency, 0),
            driipSettlementChallengeContract.getCurrentProposalStageAmount(this.address, this.currency, 0),
            driipSettlementChallengeContract.getCurrentProposalStatus(this.address, this.currency, 0),
            driipSettlementChallengeContract.hasProposalExpired(this.address, this.currency, 0),
            driipSettlementContract.getSettlementByNonce(this.address, this.walletNonce)
        ]);
    
        if (this.walletNonce !== currentNonce.toNumber()) 
            throw new Error('Wallet nonce from receipt should match with nonce on-chain!');
        if (this.stageAmount.toString() !== stageAmount.toString())
            throw new Error('Stage amount should match with the one on-chain!');
        
        _status.set(this, status);
        _expirationTime.set(this, expirationTime);
        _hasExpired.set(this, hasExpired);
        _lastSettlement.set(this, lastSettlement);
    }
    catch (error) {
        throw new NestedError(error, 'Unable to sync the states of a payment settlement from the contracts.');
    }
}

module.exports = PaymentSettlement;