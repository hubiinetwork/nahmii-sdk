'use strict';
const {EthereumAddress} = require('nahmii-ethereum-address');
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
        super(address, EthereumAddress.from(receipt.currency.ct), stageAmount, provider);
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
        const walletAddress = EthereumAddress.from(address);
        const currencyAddress = EthereumAddress.from(ct);

        const contract = new DriipSettlementChallengeContract(provider);
        const [nonce, stageAmount] = await Promise.all([
            contract.getCurrentProposalNonce(walletAddress.toString(), currencyAddress.toString(), 0),
            contract.getCurrentProposalStageAmount(walletAddress.toString(), currencyAddress.toString(), 0)
        ]);
        if (!nonce) 
            return null;
        
        const allWalletReceipts = await provider.getWalletReceipts(walletAddress.toString());

        const usedReceipt = allWalletReceipts.find(
            r => determineNonceFromReceipt(r, walletAddress) === nonce.toNumber()
        );
        const currentSettlement = new PaymentSettlement(walletAddress, usedReceipt, stageAmount, provider);
        await sync.call(currentSettlement);
        return currentSettlement;
    }
    static async create(address, ct, stageAmount, provider) {
        const walletAddress = EthereumAddress.from(address);
        const currencyAddress = EthereumAddress.from(ct);

        const currentSettlement = await PaymentSettlement.load(walletAddress, currencyAddress, provider);
        if (currentSettlement && !currentSettlement.isCompleted) 
            throw new Error('Can not create new settlement object until the last settlement is completed.');
        
        const latestReceipt = await getLatestReceipt(walletAddress.toString(), currencyAddress.toString(), provider);
        const receiptBalance = determineBalanceFromReceipt(latestReceipt, walletAddress);
        if (receiptBalance.lt(stageAmount)) 
            throw new Error('The intended stage amount is greater than the receipt balance.');
        
        const newSettlement = new PaymentSettlement(walletAddress, latestReceipt, stageAmount, provider);
        return newSettlement;
    }
    static async checkForCreate(address, ct, provider) {
        const walletAddress = EthereumAddress.from(address);
        const currencyAddress = EthereumAddress.from(ct);

        const latestReceipt = await getLatestReceipt(walletAddress, currencyAddress, provider);
        if (!latestReceipt) 
            return {canStart: false, receiptToUse: null};

        const currentSettlement = await PaymentSettlement.load(walletAddress, currencyAddress, provider);
        if (currentSettlement) {
            if (!currentSettlement.isCompleted || JSON.stringify(currentSettlement.receipt) === JSON.stringify(latestReceipt)) 
                return {canStart: false, receiptToUse: null, currentSettlement};
        }

        const maxStageAmount = determineBalanceFromReceipt(latestReceipt, walletAddress);
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

    const {address, currency} = this.toJSON();

    const [expirationTime, status, hasExpired, settlementHistory] = await Promise.all([
        driipSettlementChallengeContract.getCurrentProposalExpirationTime(address, currency, 0),
        driipSettlementChallengeContract.getCurrentProposalStatus(address, currency, 0),
        driipSettlementChallengeContract.hasCurrentProposalExpired(address, currency, 0),
        driipSettlementContract.getSettlementByNonce(address, this.walletNonce)
    ]);

    _status.set(this, status);
    _expirationTime.set(this, expirationTime);
    _hasExpired.set(this, hasExpired);
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