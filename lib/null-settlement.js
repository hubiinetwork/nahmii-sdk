'use strict';

/**
 * @module nahmii-sdk
 */

const NullSettlementChallengeContract = require('./null-settlement-challenge-contract');
const NullSettlementContract = require('./null-settlement-contract');

const _provider = new WeakMap();
const _nullSettlementChallengeContract = new WeakMap();
const _nullSettlementContract = new WeakMap();

/**
 * @class NullSettlement
 * A class for creating a _hubii nahmii_ NullSettlement, which is used for settlements without driips.
 * @alias module:nahmii-sdk
 * @example
 * const nahmii = require('nahmii-sdk');
 * const provider = new nahmii.NahmiiProvider(nahmii_base_url, nahmii_app_id, nahmii_app_secret);
 *
 * const nullSettlement = new nahmii.NullSettlement(provider);
 * const expired = await nullSettlement.hasCurrentProposalExpired(walletAddress, currencyAddress, currencyId);
 */
class NullSettlement {
    /**
     * Constructor
     * @param {NahmiiProvider} provider - A NahmiiProvider instance
     */
    constructor(provider) {
        _provider.set(this, provider);
        _nullSettlementChallengeContract.set(this, new NullSettlementChallengeContract(provider));
        _nullSettlementContract.set(this, new NullSettlementContract(provider));
    }

    /**
     * Returns locked state of the given wallet
     * @param {Address} address - The wallet address
     * @returns {Promise} A promise that resolves into a boolean value indicating if the wallet has been locked.
     * @example
     * let locked = await nullSettlement.isWalletLocked(address);
     */
    async isWalletLocked(address) {
        const challengeContract = _nullSettlementChallengeContract.get(this);
        try {
            return await challengeContract.isLockedWallet(address);
        } catch (err) {
            return null;
        }
    }

    /**
     * Returns expire state of the current proposal
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a boolean value indicating if the latest challenge has expired.
     * @example
     * let hasExpired = await nullSettlement.hasCurrentProposalExpired(address, ct, id);
     */
    async hasCurrentProposalExpired(address, ct, id) {
        const challengeContract = _nullSettlementChallengeContract.get(this);
        try {
            return await challengeContract.hasProposalExpired(address, ct, id);
        } catch (err) {
            return null;
        }
    }

    /**
     * Returns the proposal nonce
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a BigNumber value representing the nonce of the latest challenge.
     * @example
     * let nonce = await nullSettlement.getCurrentProposalNonce(address, ct, id);
     */
    async getCurrentProposalNonce(address, ct, id) {
        const challengeContract = _nullSettlementChallengeContract.get(this);
        try {
            return await challengeContract.proposalNonce(address, ct, id);
        } catch (err) {
            return null;
        }
    }

    /**
     * Returns expiration timestamp
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a BigNumber value representing the timeout timestamp.
     * @example
     * let expirationTime = await nullSettlement.getCurrentProposalExpirationTime(address, ct, id);
     */
    async getCurrentProposalExpirationTime(address, ct, id) {
        const challengeContract = _nullSettlementChallengeContract.get(this);
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
     * @returns {Promise} A promise that resolves into a BigNumber value representing the indended stage amount for the latest challenge.
     * @example
     * let stagedAmount = await nullSettlement.getCurrentProposalStageAmount(address, ct, id);
     */
    async getCurrentProposalStageAmount(address, ct, id) {
        const challengeContract = _nullSettlementChallengeContract.get(this);
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
     * let status = await nullSettlement.getCurrentProposalStatus(address, ct, id);
     */
    async getCurrentProposalStatus(address, ct, id) {
        const challengeStatuses = ['Qualified', 'Disqualified'];
        const challengeContract = _nullSettlementChallengeContract.get(this);
        try {
            const statusIndex = await challengeContract.proposalStatus(address, ct, id);
            return challengeStatuses[statusIndex];
        } catch (err) {
            return null;
        }
    }

    /**
     * Returns max null nonce.
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into the max null nonce of the wallet-currency pair.
     * @example
     * let settlement = await nullSettlement.getMaxNullNonce(address, ct, id);
     */
    async getMaxNullNonce(address, ct, id) {
        try {
            const nullSettlementContract = _nullSettlementContract.get(this);
            const maxNullNonce = await nullSettlementContract.walletCurrencyMaxNullNonce(address, ct, id);
            return maxNullNonce;
        } catch (error) {
            return null;
        }
    }

    /**
     * Check if a wallet can settle for an intended stage amount.
     * @param {MonetaryAmount} stageAmount - The intended stage amount to check with.
     * @param {Address} address - The wallet address.
     * @returns {Promise} A promise that resolves into true or throws errors
     */
    async checkStartChallenge(stageAmount, address) {
        const {currency} = stageAmount.toJSON();
        const locked = await this.isWalletLocked(address);
        const expired = await this.hasCurrentProposalExpired(address, currency.ct, currency.id);

        if (locked)
            throw new Error('Wallet is locked!');

        if (expired === false)
            throw new Error('Current challenge proposal has not expired!');

        return true;
    }

    /**
     * Check if a wallet can settle for an intended stage amount.
     * @param {Address} address - The wallet address.
     * @param {Address} ct - The currency address.
     * @param {Integer} id - The currency id.
     * @returns {Promise} A promise that resolves into true or throws errors
     */
    async checkSettleNull(address, ct, id) {
        const locked = await this.isWalletLocked(address);
        const expired = await this.hasCurrentProposalExpired(address, ct, id);
        const currentStatus = await this.getCurrentProposalStatus(address, ct, id);
        const currentNonce = await this.getCurrentProposalNonce(address, ct, id);
        const maxNullNonce = await this.getMaxNullNonce(address, ct, id);

        if (locked)
            throw new Error('Wallet is locked!');

        if (!expired)
            throw new Error('Current challenge proposal has not expired!');
        
        if (currentStatus === 'Disqualified') 
            throw new Error('Current challenge proposal is disqualified!');

        if (currentNonce <= maxNullNonce)
            throw new Error('The settlement can not be replayed!');

        return true;
    }

    /**
     * Settle a null settlement.
     * @param {Wallet} wallet - The wallet object that initiates payment settlement.
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     * @example
     * let hashObj = await nullSettlement.settleNull(address, ct, id, {gasLimit: 200000});
     */
    async settleNull(wallet, ct, id, options = {}) {
        await this.checkSettleNull(wallet.address, ct, id);

        const nullSettlementContract = new NullSettlementContract(wallet);
        return await nullSettlementContract.settleNull(ct, id, options);
    }

    /**
     * Start a null settlement challenge.
     * @param {Wallet} wallet - The wallet object that starts the challenge.
     * @param {MonetaryAmount} stageAmount - The amount to stage from the settled balance during the settlement.
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     * @example
     * let hashObj = await nullSettlement.startChallenge(address, stageAmount, {gasLimit: 200000});
     */
    async startChallenge(wallet, stageAmount, options = {}) {
        const {amount, currency} = stageAmount.toJSON();
        await this.checkStartChallenge(stageAmount, wallet.address);

        const challengeContract = new NullSettlementChallengeContract(wallet);
        return await challengeContract.startChallenge(amount, currency.ct, currency.id, options);
    }
}

module.exports = NullSettlement;
