'use strict';

/**
 * @module nahmii-sdk
 */

const ethers = require('ethers');
const {isRevertContractException, determineNonceFromReceipt} = require('./utils');
const DriipSettlementChallengeContract = require('./driip-settlement-challenge-contract');
const DriipSettlementChallengeStateContract = require('./driip-settlement-challenge-state-contract');
const DriipSettlementContract = require('./driip-settlement-contract');
const NestedError = require('../nested-error');
const {caseInsensitiveCompare} = require('../utils');

const _provider = new WeakMap();
const _driipSettlementChallengeContract = new WeakMap();
const _driipSettlementChallengeStateContract = new WeakMap();
const _driipSettlementContract = new WeakMap();

/**
 * @class DriipSettlement
 * A class for creating a _hubii nahmii_ DriipSettlement, which is used for settlement with driip.
 * @alias module:nahmii-sdk
 * @example
 * const nahmii = require('nahmii-sdk');
 * const provider = new nahmii.NahmiiProvider(nahmii_base_url, nahmii_app_id, nahmii_app_secret);
 *
 * const driipSettlement = new nahmii.DriipSettlement(provider);
 * const expired = await driipSettlement.hasProposalExpired(walletAddress, currencyAddress, currencyId);
 */
class DriipSettlement {
    /**
     * Constructor
     * @param {NahmiiProvider} provider - A NahmiiProvider instance
     */
    constructor(provider) {
        _provider.set(this, provider);
        _driipSettlementChallengeContract.set(this, new DriipSettlementChallengeContract(provider));
        _driipSettlementChallengeStateContract.set(this, new DriipSettlementChallengeStateContract(provider));
        _driipSettlementContract.set(this, new DriipSettlementContract(provider));
    }

    /**
     * Returns the proposal nonce
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a BigNumber value representing the nonce of the latest challenge.
     * @example
     * let nonce = await driipSettlement.getCurrentProposalNonce(address, ct, id);
     */
    async getCurrentProposalNonce(address, ct, id) {
        const challengeContract = _driipSettlementChallengeContract.get(this);
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
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a BigNumber value representing the timeout timestamp.
     * @example
     * let expirationTime = await driipSettlement.getCurrentProposalExpirationTime(address, ct, id);
     */
    async getCurrentProposalExpirationTime(address, ct, id) {
        const challengeContract = _driipSettlementChallengeContract.get(this);
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
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a boolean value indicating if the latest challenge has expired.
     * @example
     * let hasExpired = await driipSettlement.hasProposalExpired(address, ct, id);
     */
    async hasProposalExpired(address, ct, id) {
        const challengeContract = _driipSettlementChallengeContract.get(this);
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
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a BigNumber value representing the indended stage amount for the latest challenge.
     * @example
     * let stagedAmount = await driipSettlement.getCurrentProposalStageAmount(address, ct, id);
     */
    async getCurrentProposalStageAmount(address, ct, id) {
        const challengeContract = _driipSettlementChallengeContract.get(this);
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
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a string of either ['Qualified', 'Disqualified'] indicating the status of the latest challenge.
     * @example
     * let status = await driipSettlement.getCurrentProposalStatus(address, ct, id);
     */
    async getCurrentProposalStatus(address, ct, id) {
        const challengeStatuses = ['Qualified', 'Disqualified'];
        const challengeContract = _driipSettlementChallengeContract.get(this);
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
     * @param {Address} address - The wallet address.
     * @param {number} nonce - The nonce that this function queries for.
     * @returns {Promise} A promise that resolves into the settlement details object.
     * @example
     * let settlement = await driipSettlement.settlementByWalletAndNonce('0x0000000000000000000000000000000000000001', 1);
     */
    async getSettlementByNonce(address, nonce) {
        try {
            const driipSettlementContract = _driipSettlementContract.get(this);
            const settlement = await driipSettlementContract.settlementByWalletAndNonce(address, nonce);
            return settlement;
        }
        catch (err) {
            if (isRevertContractException(err)) 
                return null;
            
            throw new NestedError(err, 'Unable to get the settlement object by nonce.');
        }
    }

    /**
     * Returns block number of the start of the current settlement proposal
     * @param {Address} address - The wallet address.
     * @param {Address} ct - The currency address.
     * @returns {Promise} A promise that resolves into true or throws errors
     */
    async getCurrentProposalStartBlockNumber(address, ct) {
        try {
            const driipSettlementChallengeStateContract = _driipSettlementChallengeStateContract.get(this);
            return await driipSettlementChallengeStateContract.proposalDefinitionBlockNumber(address, ct);
        }
        catch (err) {
            if (isRevertContractException(err)) 
                return null;
            
            throw new NestedError(err, 'Unable to get the start block number of the current proposal.');
        }
    }
    
    /**
     * Check if the driip has been settled by a wallet
     * @param {number} nonce - The nonce that this function queries for.
     * @param {Address} address - The wallet address that this function queries for.
     * @returns {Promise} A promise that resolves into boolean to indicate if the driip has been settled.
     */
    async hasPaymentDriipSettled(nonce, address) {

        try {
            const historySettlement = await this.getSettlementByNonce(address, nonce);
    
            let settled = false;
            if (historySettlement) {
                ['origin', 'target'].forEach((key) => {
                    if (historySettlement[key].done && caseInsensitiveCompare(historySettlement[key].wallet, address))
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
     * @param {Address} address - The wallet address.
     * @returns {Promise} A promise that resolves into true or throws errors
     */
    async checkStartChallengeFromPayment(receipt, address) {
        try {
            const _receipt = receipt.toJSON();
            const {currency} = _receipt;
            const nonce = determineNonceFromReceipt(_receipt, address);
            const [expired, settled, latestNonce] = await Promise.all([
                this.hasProposalExpired(address, currency.ct, currency.id),
                this.hasPaymentDriipSettled(nonce, address),
                this.getCurrentProposalNonce(address, currency.ct, currency.id)
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
     * @param {Address} address - The wallet address.
     * @returns {Promise} A promise that resolves into true or throws errors
     */
    async checkSettleDriipAsPayment(receipt, address) {
        try {
            const _receipt = receipt.toJSON();
            const {currency} = _receipt;
            const nonce = determineNonceFromReceipt(_receipt, address);
            const [expired, currentStatus, settled] = await Promise.all([
                this.hasProposalExpired(address, currency.ct, currency.id),
                this.getCurrentProposalStatus(address, currency.ct, currency.id),
                this.hasPaymentDriipSettled(nonce, address)
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
     * @param {Wallet} wallet - The wallet object that initiates payment settlement.
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     * @example
     * let hashObj = await driipSettlement.settleDriipAsPayment(receipt, wallet, {gasLimit: 200000});
     */
    async settleDriipAsPayment(receipt, wallet, options = {}) {
        const {valid, reasons} = await this.checkSettleDriipAsPayment(receipt, wallet.address);
        if (!valid) {
            const error = new Error('Can not settle payment');
            error.reasons = reasons;
            throw error;
        }

        try {
            const driipSettlementContract = new DriipSettlementContract(wallet);
            return await driipSettlementContract.settlePayment(receipt.toJSON(), 'ERC20', options);
        }
        catch (error) {
            throw new NestedError(error, 'Unable to settle payment driip.');
        }
    }

    /**
     * Start a challenge from a payment
     * @param {Receipt} receipt - The receipt object for payment challenge.
     * @param {MonetaryAmount} stageAmount - The amount to stage from the settled balance during the settlement.
     * @param {Wallet} wallet - The wallet object that starts the payment challenge.
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     * @example
     * let hashObj = await driipSettlement.startChallengeFromPayment(receipt, stageAmount, wallet, {gasLimit: 200000});
     */
    async startChallengeFromPayment(receipt, stageAmount, wallet, options = {}) {
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

    /**
     * Stop a driip settlement challenge for wallet/currency pair.
     * @param {Wallet} wallet - The wallet object to stop the challenge.
     * @param {Address} ct - The currency address.
     * @param {Integer} id - The currency id.
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     */
    async stopChallenge(wallet, ct, id, options = {}) {
        try {
            const challengeContract = new DriipSettlementChallengeContract(wallet);
            return await challengeContract.stopChallenge(ct, id, options);
        }
        catch (error) {
            throw new NestedError(error, 'Unable to stop a payment driip challenge.');
        }
    }
}

module.exports = DriipSettlement;
