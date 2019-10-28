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
const _receipt = new WeakMap();
const _settlementHistory = new WeakMap();
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
        return (this.isOngoing || this.status || this.isCompleted) ? true : false;
    }
    get isCompleted() {
        const settlementHistory = _settlementHistory.get(this);

        if (settlementHistory) {
            for(const role of ['origin', 'target']) {
                if (!settlementHistory[role].doneBlockNumber.isZero() && caseInsensitiveCompare(settlementHistory[role].wallet, this.address))
                    return true;
            }
        }

        return false;
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
            const registeredEvent = await this.provider.registerSettlement(signedTransaction);
            
            return registeredEvent;
        }
        catch (error) {
            console.log(error);
            throw new NestedError(error, 'Unable to start a payment settlement.');
        }
    }
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
        if (currentSettlement && !currentSettlement.isCompleted) 
            throw new Error('Can not create new settlement object until the last settlement is completed.');
        
        const latestReceipt = await getLatestReceipt(address, ct, provider);
        const receiptBalance = determineBalanceFromReceipt(latestReceipt, address);
        if (receiptBalance.lt(stageAmount)) 
            throw new Error('The intended stage amount is greater than the receipt balance.');
        
        const newSettlement = new PaymentSettlement(address, latestReceipt, stageAmount, provider);
        return newSettlement;
    }
    static async checkForCreate(address, ct, provider) {
        const latestReceipt = await getLatestReceipt(address, ct, provider);
        if (!latestReceipt) 
            return {canStart: false, receiptToUse: null};

        const currentSettlement = await PaymentSettlement.load(address, ct, provider);
        if (currentSettlement) {
            if (!currentSettlement.isCompleted || JSON.stringify(currentSettlement.receipt) === JSON.stringify(latestReceipt)) 
                return {canStart: false, receiptToUse: null, currentSettlement};
        }

        const maxStageAmount = determineBalanceFromReceipt(latestReceipt, address);
        return {canStart: true, maxStageAmount, receiptToUse: latestReceipt};
    }
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
            expirationTime: this.expirationTime
        };
    }
}

async function sync() {
    const driipSettlementContract = _driipSettlementContract.get(this);
    const driipSettlementChallengeContract = _driipSettlementChallengeContract.get(this);

    const [expirationTime, status, hasExpired, settlementHistory] = await Promise.all([
        driipSettlementChallengeContract.getCurrentProposalExpirationTime(this.address, this.currency, 0),
        driipSettlementChallengeContract.getCurrentProposalStatus(this.address, this.currency, 0),
        driipSettlementChallengeContract.hasCurrentProposalExpired(this.address, this.currency, 0),
        driipSettlementContract.getSettlementByNonce(this.address, this.walletNonce)
    ]);

    _status.set(this, status);
    _expirationTime.set(this, expirationTime);
    _hasExpired.set(this, hasExpired);
    _settlementHistory.set(this, settlementHistory);
}

async function getLatestReceipt(address, ct, provider) {
    const receipts = await provider.getWalletReceipts(address, null, 100);
    const filteredReceipts = receipts
        .filter(r => caseInsensitiveCompare(r.currency.ct, ct))
        .sort((a, b) => determineNonceFromReceipt(b, address) - determineNonceFromReceipt(a, address));
    
    const latestReceipt = filteredReceipts[0];
    return latestReceipt;
}

module.exports = PaymentSettlement;