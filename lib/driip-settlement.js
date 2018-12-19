'use strict';

/**
 * @module nahmii-sdk
 */

const ethers = require('ethers');
const {isRevertContractException} = require('./utils');
const DriipSettlementChallengeContract = require('./driip-settlement-challenge-contract');
const DriipSettlementContract = require('./driip-settlement-contract');
const NestedError = require('./nested-error');

const _wallet = new WeakMap();
const _currencyAddress = new WeakMap();
const _currencyId = new WeakMap();
const _driipSettlementChallengeContract = new WeakMap();
const _driipSettlementContract = new WeakMap();

/**
 * @class DriipSettlement
 * A class for creating a _hubii nahmii_ DriipSettlement, which is used for settlement with driip.
 * @alias module:nahmii-sdk
 */
class DriipSettlement {
    /**
     * Constructor
     * @param {NahmiiProvider} provider - A NahmiiProvider instance
     */
    constructor(wallet, currencyAddress, currencyId = 0) {
        _wallet.set(this, wallet);
        _currencyAddress.set(this, currencyAddress)
        _currencyId.set(this, currencyId)

        _driipSettlementChallengeContract.set(this, new DriipSettlementChallengeContract(wallet.provider));
        _driipSettlementContract.set(this, new DriipSettlementContract(wallet.provider));
    }

    /**
     * Returns the proposal nonce
     * @returns {Promise} A promise that resolves into a BigNumber value representing the nonce of the latest challenge.
     * @example
     * let nonce = await driipSettlement.getCurrentProposalNonce();
     */
    async getCurrentProposalNonce() {
        const challengeContract = _driipSettlementChallengeContract.get(this);
        const address = _wallet.get(this).address;
        const ct = _currencyAddress.get(this);
        const id = _currencyId.get(this);
        
        try {
            return await challengeContract.proposalNonce(address, ct, id);
        }
        catch (err) {
            if (isRevertContractException(err)) 
                return null;
            
            throw new NestedError(err, 'Unable to get the nonce of the current proposal.');
        }
    }

    /**
     * Returns the expiration time of the proposal
     * @returns {Promise} A promise that resolves into a BigNumber value representing the timeout timestamp.
     * @example
     * let expirationTime = await driipSettlement.getCurrentProposalExpirationTime();
     */
    async getCurrentProposalExpirationTime() {
        const challengeContract = _driipSettlementChallengeContract.get(this);
        const address = _wallet.get(this).address;
        const ct = _currencyAddress.get(this);
        const id = _currencyId.get(this);

        try {
            return await challengeContract.proposalExpirationTime(address, ct, id);
        }
        catch (err) {
            if (isRevertContractException(err)) 
                return null;
            
            throw new NestedError(err, 'Unable to get the expiration time of the current proposal.');
        }
    }

    /**
     * Returns expire state of the current proposal
     * @returns {Promise} A promise that resolves into a boolean value indicating if the latest challenge has expired.
     * @example
     * let hasExpired = await driipSettlement.hasProposalExpired();
     */
    async hasProposalExpired() {
        const challengeContract = _driipSettlementChallengeContract.get(this);
        const address = _wallet.get(this).address;
        const ct = _currencyAddress.get(this);
        const id = _currencyId.get(this);

        try {
            return await challengeContract.hasProposalExpired(address, ct, id);
        }
        catch (err) {
            if (isRevertContractException(err)) 
                return null;
            
            throw new NestedError(err, 'Unable to check whether the proposal has expired.');
        }
    }

    /**
     * Returns intended stage amount of the current challenge proposal
     * @returns {Promise} A promise that resolves into a BigNumber value representing the indended stage amount for the latest challenge.
     * @example
     * let stagedAmount = await driipSettlement.getCurrentProposalStageAmount();
     */
    async getCurrentProposalStageAmount() {
        const challengeContract = _driipSettlementChallengeContract.get(this);
        const address = _wallet.get(this).address;
        const ct = _currencyAddress.get(this);
        const id = _currencyId.get(this);

        try {
            return await challengeContract.proposalStageAmount(address, ct, id);
        }
        catch (err) {
            if (isRevertContractException(err)) 
                return null;
            
            throw new NestedError(err, 'Unable to get the stage amount of the proposal.');
        }
    }

    /**
     * Returns status of the current challenge proposal
     * @returns {Promise} A promise that resolves into a string of either ['Qualified', 'Disqualified'] indicating the status of the latest challenge.
     * @example
     * let status = await driipSettlement.getCurrentProposalStatus();
     */
    async getCurrentProposalStatus() {
        const challengeStatuses = ['Qualified', 'Disqualified'];
        const challengeContract = _driipSettlementChallengeContract.get(this);
        const address = _wallet.get(this).address;
        const ct = _currencyAddress.get(this);
        const id = _currencyId.get(this);

        try {
            const statusIndex = await challengeContract.proposalStatus(address, ct, id);
            return challengeStatuses[statusIndex];
        }
        catch (err) {
            if (isRevertContractException(err)) 
                return null;
            
            throw new NestedError(err, 'Unable to get the status of the proposal.');
        }
    }

    /**
     * Returns settlement details object. 
     * @param {number} nonce - The nonce that this function queries for.
     * @returns {Promise} A promise that resolves into the settlement details object.
     * @example
     * let settlement = await driipSettlement.getSettlementHistoryByNonce(1);
     */
    async getSettlementHistoryByNonce(nonce) {
        try {
            const driipSettlementContract = _driipSettlementContract.get(this);
            const settlement = await driipSettlementContract.settlementByNonce(nonce);
            return settlement;
        }
        catch (err) {
            if (isRevertContractException(err)) 
                return null;
            
            throw new NestedError(err, 'Unable to get the settlement object by nonce.');
        }
    }
    
    /**
     * Check if the driip has been settled by a wallet
     * @param {number} nonce - The nonce that this function queries for.
     * @returns {Promise} A promise that resolves into boolean to indicate if the driip has been settled.
     */
    async hasPaymentDriipSettled(nonce) {
        const address = _wallet.get(this).address;

        try {
            let historySettlement = await this.getSettlementHistoryByNonce(nonce);
    
            let settled = false;
            if (historySettlement) {
                ['origin', 'target'].forEach((key) => {
                    if (historySettlement[key].done && historySettlement[key].wallet === address) 
                        settled = true;
                });
            }
    
            return settled;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to check if the payment driip has been settled already.');
        }
    }

    /**
     * Check if a wallet can start new challenge for a nahmii payment receipt
     * @param {Receipt} receipt - The nahmii receipt object to check with.
     * @returns {Promise} A promise that resolves into true or throws errors
     */
    async checkStartChallengeFromPayment(receipt) {
        try {
            const {nonce} = receipt.toJSON();
            const [expired, settled, latestNonce] = await Promise.all([
                this.hasProposalExpired(),
                this.hasPaymentDriipSettled(nonce),
                this.getCurrentProposalNonce()
            ]);

            const invalidReasons = [];
            if (expired === false)
                invalidReasons.push(new Error('Current challenge proposal has not expired yet!'));
    
            if (settled)
                invalidReasons.push(new Error('The settlement can not be replayed!'));
    
            if (ethers.utils.bigNumberify(nonce) <= latestNonce)
                invalidReasons.push(new Error('The challenge can not be restarted!'));
    
            if (invalidReasons.length)
                return {valid: false, reasons: invalidReasons};
    
            return {valid: true};
        }
        catch (error) {
            throw new NestedError(error, 'Unable to check if it can start new payment driip challenge.');
        }
    }

    /**
     * Check if a wallet can settle for a nahmii payment receipt
     * @param {Receipt} receipt - The nahmii receipt object to check with.
     * @returns {Promise} A promise that resolves into true or throws errors
     */
    async checkSettleDriipAsPayment(receipt) {
        try {
            const {nonce} = receipt.toJSON();
            const [expired, currentStatus, settled] = await Promise.all([
                this.hasProposalExpired(),
                this.getCurrentProposalStatus(),
                this.hasPaymentDriipSettled(nonce)
            ]);

            const invalidReasons = [];
            if (!expired)
                invalidReasons.push(new Error('Current challenge proposal has not expired yet!'));
            
            if (currentStatus === 'Disqualified')
                invalidReasons.push(new Error('Current challenge proposal is disqualified!'));
    
            if (settled)
                invalidReasons.push(new Error('The settlement can not be replayed!'));
    
            if (invalidReasons.length) 
                return {valid: false, reasons: invalidReasons};
            
            return {valid: true};
        }
        catch (error) {
            throw new NestedError(error, 'Unable to check if the payment driip challenge can be started.');
        }
    }

    /**
     * Settle a payment driip of this wallet.
     * @param {Receipt} receipt - The receipt object for the payment settlement.
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     * @example
     * let hashObj = await driipSettlement.settleDriipAsPayment(receipt, {gasLimit: 200000});
     */
    async settleDriipAsPayment(receipt, options = {}) {
        const wallet = _wallet.get(this);
        const {valid, reasons} = await this.checkSettleDriipAsPayment(receipt, wallet.address);
        if (!valid) {
            const error = new Error('Can not settle payment');
            error.reasons = reasons;
            throw error;
        }

        try {
            const driipSettlementContract = new DriipSettlementContract(wallet);
            return await driipSettlementContract.settlePayment(receipt.toJSON(), options);
        }
        catch (error) {
            throw new NestedError(error, 'Unable to settle payment driip.');
        }
    }

    /**
     * Start a challenge from a payment
     * @param {Receipt} receipt - The receipt object for payment challenge.
     * @param {MonetaryAmount} stageAmount - The amount to stage from the settled balance during the settlement.
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     * @example
     * let hashObj = await driipSettlement.startChallengeFromPayment(receipt, stageAmount, wallet, {gasLimit: 200000});
     */
    async startChallengeFromPayment(receipt, stageAmount, options = {}) {
        const wallet = _wallet.get(this);
        const result = await this.checkStartChallengeFromPayment(receipt, wallet.address);
        if (!result.valid) {
            const error = new Error('Can not start challenge from payment');
            error.reasons = result.reasons;
            throw error;
        }

        try {
            const {amount} = stageAmount.toJSON();
            const challengeContract = new DriipSettlementChallengeContract(wallet);
            return await challengeContract.startChallengeFromPayment(receipt.toJSON(), amount, options);
        }
        catch (error) {
            throw new NestedError(error, 'Unable to start new payment driip challenge.');
        }
    }
}

module.exports = DriipSettlement;
