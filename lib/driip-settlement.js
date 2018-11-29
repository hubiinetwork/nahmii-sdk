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
 * @class DriipSettlement
 * A class for creating a _hubii nahmii_ DriipSettlement, which is used for settlement with driip.
 * @alias module:nahmii-sdk
 * @example
 * const nahmii = require('nahmii-sdk');
 * const provider = new nahmii.NahmiiProvider(nahmii_base_url, nahmii_app_id, nahmii_app_secret);
 *
 * const driipSettlement = new nahmii.DriipSettlement(provider);
 * const expired = await driipSettlement.hasProposalExpired(walletAddress, currencyContract, currencyId)
 */
class DriipSettlement {
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
     * Returns intended stage amount of the current challenge proposal
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
     * let expirationTime = await driipSettlement.getCurrentProposalExpirationTime(address, ct, id);
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
     * let hasExpired = await driipSettlement.hasProposalExpired(address, ct, id);
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
        } catch (err) {
            return null;
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
        } catch (err) {
            return null;
        }
    }

    /**
     * Returns settlement details object. 
     * @param {number} nonce - The nonce that this function queries for.
     * @returns {Promise} A promise that resolves into the settlement details object.
     * @example
     * let settlement = await driipSettlement.getSettlementByNonce(1);
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
    
    async hasPaymentDriipSettled(nonce, address) {
        let historySettlement = await this.getSettlementByNonce(nonce);

        let settled = false;
        if (historySettlement) {
            ['origin', 'target'].forEach((key) => {
                if (historySettlement[key].done && historySettlement[key].wallet === address) 
                    settled = true;
            });
        }

        return settled;
    }

    async checkStartChallengeFromPayment(receipt, address) {
        const {nonce, currency} = receipt.toJSON();
        const expired = await this.hasProposalExpired(address, currency.ct, currency.id);
        const settled = await this.hasPaymentDriipSettled(nonce, address);
        const latestNonce = await this.getCurrentProposalNonce(address, currency.ct, currency.id);

        if (expired === false) 
            throw new Error('Current challenge proposal has not expired yet!');

        if (settled) 
            throw new Error('The settlement can not be replayed!');

        if (nonce <= latestNonce) 
            throw new Error('The challenge can not be restarted!');
        

        return true;
    }

    async checkSettleDriipAsPayment(receipt, address) {
        const {nonce, currency} = receipt.toJSON();
        const expired = await this.hasProposalExpired(address, currency.ct, currency.id);
        const currentStatus = await this.getCurrentProposalStatus(address, currency.ct, currency.id);
        const settled = await this.hasPaymentDriipSettled(nonce, address);
        
        if (!expired) 
            throw new Error('Current challenge proposal has not expired yet!');
        
        if (currentStatus === 'Disqualified') 
            throw new Error('Current challenge proposal is disqualified!');

        if (settled) 
            throw new Error('The settlement can not be replayed!');
        
        return true;
    }

    /**
     * Settle a payment driip of this wallet.
     * @param {Receipt} receipt - The receipt object for the payment settlement.
     * @param {Wallet} wallet - The wallet object that initiates payment settlement.
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     * @example
     * let hashObj = await driipSettlement.settleDriipAsPayment(receipt, {gasLimit: 200000});
     */
    async settleDriipAsPayment(receipt, wallet, options = {}) {
        await this.checkSettleDriipAsPayment(receipt, wallet.address);

        const driipSettlementContract = new DriipSettlementContract(wallet);
        return await driipSettlementContract.settlePayment(receipt.toJSON(), options);
    }

    /**
     * Start a challenge from a payment
     * @param {Receipt} receipt - The receipt object for payment challenge.
     * @param {MonetaryAmount} stageAmount - The amount to stage from the settled balance during the settlement.
     * @param {Wallet} wallet - The wallet object that starts the payment challenge.
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     * @example
     * let hashObj = await driipSettlement.startChallengeFromPayment(receipt, stageAmount, {gasLimit: 200000});
     */
    async startChallengeFromPayment(receipt, stageAmount, wallet, options = {}) {
        await this.checkStartChallengeFromPayment(receipt, wallet.address);

        const {amount} = stageAmount.toJSON();
        const challengeContract = new DriipSettlementChallengeContract(wallet);
        return await challengeContract.startChallengeFromPayment(receipt.toJSON(), amount, options);
    }
}

module.exports = DriipSettlement;
