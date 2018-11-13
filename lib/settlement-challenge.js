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
 * const challengeObj = await settlementChallenge.getCurrentPaymentChallenge(address)
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
     * Returns the details of the latest challenge. 
     * @param {Address} address - The address that this function queries for.
     * @returns {Promise} A promise that resolves into challenge details object.
     * @example
     * let details = await wallet.getCurrentPaymentChallenge();
     */
    async getCurrentPaymentChallenge(address) {
        const challengeContract = _driipSettlementChallengeContract.get(this);
        return await challengeContract.walletProposalMap(address);
    }

    /**
     * Returns phase of the current challenge. 
     * @param {Address} address - The address that this function queries for.
     * @returns {Promise} A promise that resolves into the challenge phase.
     * @example
     * let details = await wallet.getCurrentPaymentChallengePhase();
     */
    async getCurrentPaymentChallengePhase(address) {
        const challengePhases = ['Dispute', 'Closed'];
        const challengeContract = _driipSettlementChallengeContract.get(this);
        try {
            const phaseIndex = await challengeContract.challengePhase(address);
            return challengePhases[phaseIndex];
        }catch(err) {
            return null;
        }
    }
    
    /**
     * Returns status of the current challenge. 
     * @param {Address} address - The address that this function queries for.
     * @returns {Promise} A promise that resolves into the challenge status.
     * @example
     * let details = await wallet.getCurrentPaymentChallengeStatus();
     */
    async getCurrentPaymentChallengeStatus(address) {
        const challengeStatuses = ['Unknown', 'Qualified', 'Disqualified'];
        const challengeContract = _driipSettlementChallengeContract.get(this);
        const statusIndex = await challengeContract.proposalStatus(address);
        return challengeStatuses[statusIndex];
    }

    /**
     * Returns settlement details object. 
     * @param {number} nonce - The nonce that this function queries for.
     * @returns {Promise} A promise that resolves into the settlement details object.
     * @example
     * let settlement = await wallet.getSettlementByNonce(1);
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
     * let hashObj = await wallet.settleDriipAsPayment(receipt, {gasLimit: 200000});
     */
    async settleDriipAsPayment(receipt, wallet, options = {}) {
        const receiptJSON = receipt.toJSON();
        const currentPhase = await this.getCurrentPaymentChallengePhase(wallet.address);
        const currentStatus = await this.getCurrentPaymentChallengeStatus(wallet.address);
        const currentSettlement = await this.getSettlementByNonce(receiptJSON.nonce);
        
        if (currentPhase === 'Dispute') 
            throw new Error('Current challenge phase is in dispute, can not settle the driip!');
        
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
     * Start a payment challenge period for a receipt
     * @param {Receipt} receipt - The receipt object for payment challenge.
     * @param {MonetaryAmount} stageAmount - The amount to stage from the settled balance during the settlement.
     * @param {Wallet} wallet - The wallet object that starts the payment challenge.
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     * @example
     * let hashObj = await wallet.startChallengeFromPayment(receipt, stageAmount, {gasLimit: 200000});
     */
    async startChallengeFromPayment(receipt, stageAmount, wallet, options = {}) {
        const currentPhase = await this.getCurrentPaymentChallengePhase(wallet.address);
        if (currentPhase === 'Dispute') 
            throw new Error('Current challenge phase is in dispute, can not start new payment challenge!');
        
        const {amount} = stageAmount.toJSON();
        const challengeContract = new DriipSettlementChallengeContract(wallet);
        return await challengeContract.startChallengeFromPayment(receipt.toJSON(), amount, options);
    }
}


module.exports = SettlementChallenge;
