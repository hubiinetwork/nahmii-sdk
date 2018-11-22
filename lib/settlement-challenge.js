'use strict';

/**
 * @module nahmii-sdk
 */

const DriipSettlementChallengeContract = require('./driip-settlement-challenge-contract');
const DriipSettlementContract = require('./driip-settlement-contract');

const _provider = new WeakMap();
const _driipSettlementChallengeContract = new WeakMap();
const _driipSettlementContract = new WeakMap();

/**
 * @class SettlementChallenge
 * A class for creating a _hubii nahmii_ SettlementChallenge, which is used for settlement or challenge related operations.
 * @alias module:nahmii-sdk
 * @example
 * const nahmii = require('nahmii-sdk');
 * const provider = new nahmii.NahmiiProvider(nahmii_base_url, nahmii_app_id, nahmii_app_secret);
 *
 * const settlementChallenge = new nahmii.SettlementChallenge(provider);
 * const challengeObj = await settlementChallenge.getCurrentPaymentChallenge(walletAddress, currencyContract, currencyId)
 */
class SettlementChallenge {
    /**
     * Constructor
     * @param {NahmiiProvider} provider - A NahmiiProvider instance
     */
    constructor(provider) {
        _provider.set(this, provider);
        _driipSettlementChallengeContract.set(this, new DriipSettlementChallengeContract(provider));
        _driipSettlementContract.set(this, new DriipSettlementContract(provider));
    }

    /**
     * Returns intended stage amount of the current challenge proposal.
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a BigNumber value representing the nonce of the latest challenge.
     * @example
     * let nonce = await settlementChallenge.getCurrentProposalNonce(address, ct, id);
     */
    async getCurrentProposalNonce(address, ct, id) {
        const challengeContract = _driipSettlementChallengeContract.get(this);
        try {
            return await challengeContract.proposalNonce(address, ct, id);
        } catch (err) {
            return null;
        }
    }

    /**
     * Returns intended stage amount of the current challenge proposal
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a BigNumber value representing the timeout timestamp.
     * @example
     * let expirationTime = await settlementChallenge.getCurrentProposalExpirationTime(address, ct, id);
     */
    async getCurrentProposalExpirationTime(address, ct, id) {
        const challengeContract = _driipSettlementChallengeContract.get(this);
        try {
            return await challengeContract.proposalExpirationTime(address, ct, id);
        } catch (err) {
            return null;
        }
    }

    /**
     * Returns intended stage amount of the current challenge proposal
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a boolean value indicating if the latest challenge has expired.
     * @example
     * let hasExpired = await settlementChallenge.hasProposalExpired(address, ct, id);
     */
    async hasProposalExpired(address, ct, id) {
        const challengeContract = _driipSettlementChallengeContract.get(this);
        try {
            return await challengeContract.hasProposalExpired(address, ct, id);
        } catch (err) {
            return null;
        }
    }

    /**
     * Returns intended stage amount of the current challenge. 
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a BigNumber value representing the indended stage amount for the latest challenge.
     * @example
     * let stagedAmount = await settlementChallenge.getCurrentProposalStageAmount(address, ct, id);
     */
    async getCurrentProposalStageAmount(address, ct, id) {
        const challengeContract = _driipSettlementChallengeContract.get(this);
        try {
            return await challengeContract.proposalStageAmount(address, ct, id);
        } catch (err) {
            return null;
        }
    }

    /**
     * Returns status of the current challenge. 
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a string of either ['Qualified', 'Disqualified'] indicating the status of the latest challenge.
     * @example
     * let status = await settlementChallenge.getCurrentProposalStatus(address, ct, id);
     */
    async getCurrentProposalStatus(address, ct, id) {
        const challengeStatuses = ['Qualified', 'Disqualified'];
        const challengeContract = _driipSettlementChallengeContract.get(this);
        try {
            const statusIndex = await challengeContract.proposalStatus(address, ct, id);
            return challengeStatuses[statusIndex];
        } catch (err) {
            return null;
        }
    }

    /**
     * Returns settlement details object. 
     * @param {number} nonce - The nonce that this function queries for.
     * @returns {Promise} A promise that resolves into the settlement details object.
     * @example
     * let settlement = await settlementChallenge.getSettlementByNonce(1);
     */
    async getSettlementByNonce(nonce) {
        try {
            const driipSettlementContract = _driipSettlementContract.get(this);
            const settlement = await driipSettlementContract.settlementByNonce(nonce);
            return settlement;
        } catch (error) {
            return null;
        }
    }

    /**
     * Settle a payment driip of this wallet.
     * @param {Receipt} receipt - The receipt object for the payment settlement.
     * @param {Wallet} wallet - The wallet object that initiates payment settlement.
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     * @example
     * let hashObj = await settlementChallenge.settleDriipAsPayment(receipt, {gasLimit: 200000});
     */
    async settleDriipAsPayment(receipt, wallet, options = {}) {
        const receiptJSON = receipt.toJSON();
        const expired = await this.hasProposalExpired(wallet.address, receiptJSON.currency.ct, receiptJSON.currency.id);
        const currentStatus = await this.getCurrentProposalStatus(wallet.address, receiptJSON.currency.ct, receiptJSON.currency.id);
        const currentSettlement = await this.getSettlementByNonce(receiptJSON.nonce);
        
        if (!expired) 
            throw new Error('Current challenge is not expired yet!');
        
        if (currentStatus === 'Disqualified') 
            throw new Error('Current challenge status is in disqualified, can not settle the driip!');

        if (currentSettlement) {
            ['origin', 'target'].forEach((key) => {
                if (currentSettlement[key].done && currentSettlement[key].wallet === wallet.address) 
                    throw new Error('The settlement is already done before, not allowed to be settled more than once!');
                
            });
        }

        const driipSettlementContract = new DriipSettlementContract(wallet);
        return await driipSettlementContract.settlePayment(receiptJSON, options);
    }

    /**
     * Start a payment challenge
     * @param {Receipt} receipt - The receipt object for payment challenge.
     * @param {MonetaryAmount} stageAmount - The amount to stage from the settled balance during the settlement.
     * @param {Wallet} wallet - The wallet object that starts the payment challenge.
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     * @example
     * let hashObj = await settlementChallenge.startChallengeFromPayment(receipt, stageAmount, {gasLimit: 200000});
     */
    async startChallengeFromPayment(receipt, stageAmount, wallet, options = {}) {
        const receiptJSON = receipt.toJSON();
        const expired = await this.hasProposalExpired(wallet.address, receiptJSON.currency.ct, receiptJSON.currency.id);
        if (expired === false) 
            throw new Error('Current challenge proposal has not expired. New challenge can not be started!');

        const {amount} = stageAmount.toJSON();
        const challengeContract = new DriipSettlementChallengeContract(wallet);
        return await challengeContract.startChallengeFromPayment(receiptJSON, amount, options);
    }
}

module.exports = SettlementChallenge;
