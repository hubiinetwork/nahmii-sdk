'use strict';

/**
 * @module nahmii-sdk
 */

const {isRevertContractException} = require('./utils');
const NullSettlementChallengeContract = require('./null-settlement-challenge-contract');
const NullSettlementChallengeStateContract = require('./null-settlement-challenge-state-contract');
const NullSettlementContract = require('./null-settlement-contract');
const NestedError = require('../nested-error');

const _provider = new WeakMap();
const _nullSettlementChallengeContract = new WeakMap();
const _nullSettlementChallengeStateContract = new WeakMap();

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
        _nullSettlementChallengeStateContract.set(this, new NullSettlementChallengeStateContract(provider));
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
        }
        catch (err) {
            if (isRevertContractException(err))
                return null;

            throw new NestedError(err, 'Unable to check whether the proposal has expired.');
        }
    }

    /**
     * Returns the terminated state of the current proposal
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a boolean value indicating if the latest challenge has been terminated.
     * @example
     * let hasTerminated = await nullSettlement.hasCurrentProposalTerminated(address, ct, id);
     */
    async hasCurrentProposalTerminated(address, ct, id) {
        const challengeContract = _nullSettlementChallengeContract.get(this);
        try {
            return await challengeContract.hasProposalTerminated(address, ct, id);
        }
        catch (err) {
            if (isRevertContractException(err))
                return null;

            throw new NestedError(err, 'Unable to check whether the proposal has been terminated.');
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
        }
        catch (err) {
            if (isRevertContractException(err))
                return null;

            throw new NestedError(err, 'Unable to get the expiration time for current proposal.');
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
        }
        catch (err) {
            if (isRevertContractException(err))
                return null;

            throw new NestedError(err, 'Unable to get the stage amount for current proposal.');
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
        }
        catch (err) {
            if (isRevertContractException(err))
                return null;

            throw new NestedError(err, 'Unable to get the status for current proposal.');
        }
    }

    /**
     * Returns block number of the start of the current settlement proposal
     * @param {Address} address - The wallet address.
     * @param {Address} ct - The currency address.
     * @returns {Promise} A promise that resolves into a BigNumber or throws errors
     */
    async getCurrentProposalStartBlockNumber(address, ct) {
        try {
            const nullSettlementChallengeStateContract = _nullSettlementChallengeStateContract.get(this);
            return await nullSettlementChallengeStateContract.proposalDefinitionBlockNumber(address, ct);
        }
        catch (err) {
            if (isRevertContractException(err)) 
                return null;
            
            throw new NestedError(err, 'Unable to get the start block number of the current proposal.');
        }
    }

    /**
     * Check if a wallet can settle for an intended stage amount.
     * @param {MonetaryAmount} stageAmount - The intended stage amount to check with.
     * @param {Address} address - The wallet address.
     * @returns {Promise} A promise that resolves into true or throws errors
     */
    async checkStartChallenge(stageAmount, address) {
        try {
            const {currency} = stageAmount.toJSON();
            const expired = await this.hasCurrentProposalExpired(address, currency.ct, currency.id);
            const invalidReasons = [];

            if (expired === false)
                invalidReasons.push(new Error('Current challenge proposal has not expired!'));

            if (invalidReasons.length)
                return {valid: false, reasons: invalidReasons};

            return {valid: true};
        }
        catch (error) {
            throw new NestedError(error, 'Unable to check if it can start new challenge');
        }
    }

    /**
     * Check if a wallet can settle for an intended stage amount.
     * @param {Address} address - The wallet address.
     * @param {Address} ct - The currency address.
     * @param {Integer} id - The currency id.
     * @returns {Promise} A promise that resolves into true or throws errors
     */
    async checkSettleNull(address, ct, id) {
        try {
            const [expired, currentStatus, terminated] = await Promise.all([
                this.hasCurrentProposalExpired(address, ct, id),
                this.getCurrentProposalStatus(address, ct, id),
                this.hasCurrentProposalTerminated(address, ct, id)
            ]);

            const invalidReasons = [];

            if (!expired)
                invalidReasons.push(new Error('Current challenge proposal has not expired!'));

            if (currentStatus === 'Disqualified')
                invalidReasons.push(new Error('Current challenge proposal is disqualified!'));

            if (terminated)
                invalidReasons.push(new Error('The settlement can not be replayed!'));

            if (invalidReasons.length)
                return {valid: false, reasons: invalidReasons};

            return {valid: true};
        }
        catch (error) {
            throw new NestedError(error, 'Unable to check if it can settle null.');
        }
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
        const {valid, reasons} = await this.checkSettleNull(wallet.address, ct, id);
        if (!valid) {
            const error = new Error('Can not settle challenge');
            error.reasons = reasons;
            throw error;
        }

        try {
            const nullSettlementContract = new NullSettlementContract(wallet);
            return await nullSettlementContract.settleNull(ct, id, 'ERC20', options);
        }
        catch (error) {
            throw new NestedError(error, 'Unable to settle null.');
        }
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
        const {valid, reasons} = await this.checkStartChallenge(stageAmount, wallet.address);
        if (!valid) {
            const error = new Error('Can not start challenge.');
            error.reasons = reasons;
            throw error;
        }

        try {
            const challengeContract = new NullSettlementChallengeContract(wallet);
            return await challengeContract.startChallenge(amount, currency.ct, currency.id, options);
        }
        catch (error) {
            throw new NestedError(error, 'Unable to start new challenge.');
        }
    }

    /**
     * Stop a null settlement challenge for wallet/currency pair.
     * @param {Wallet} wallet - The wallet object that stops the challenge.
     * @param {Address} ct - The currency address.
     * @param {Integer} id - The currency id.
     * @param [options]
     * @returns {Promise} A promise that resolves into transaction hash.
     */
    async stopChallenge(wallet, ct, id, options = {}) {
        try {
            const challengeContract = new NullSettlementChallengeContract(wallet);
            return await challengeContract.stopChallenge(ct, id, options);
        }
        catch (error) {
            throw new NestedError(error, 'Unable to stop a null challenge.');
        }
    }
}

module.exports = NullSettlement;
