'use strict';

/**
 * @module nahmii-sdk
 */

const ethers = require('ethers');
const {caseInsensitiveCompare} = require('./utils');
const DriipSettlement = require('./driip-settlement');
const NullSettlement = require('./null-settlement');
const Receipt = require('./receipt');
const MonetaryAmount = require('./monetary-amount');

const _provider = new WeakMap();
const _driipSettlement = new WeakMap();
const _nullSettlement = new WeakMap();

/**
 * @class Settlement
 * A class for encapsulating the operations of settlements in different types.
 * @alias module:nahmii-sdk
 */
class Settlement {
    /**
     * Constructor
     * @param {NahmiiProvider} provider - A NahmiiProvider instance
     */
    constructor(provider) {
        _provider.set(this, provider);
        _driipSettlement.set(this, new DriipSettlement(provider));
        _nullSettlement.set(this, new NullSettlement(provider));
    }

    /**
     * Determine which types of challenges can be started and calculate the intended stage amount accordingly.
     * @param {MonetaryAmount} stageMonetaryAmount - The intended stage amount
     * @param {Address} walletAddress - The wallet address
     * @returns {Promise} A promise that resolves into an array determine which types of challenges can be started and calculate the intended stage amount accordingly.
     */
    async getRequiredChallengesForIntendedStageAmount(stageMonetaryAmount, walletAddress) {
        const {amount, currency} = stageMonetaryAmount.toJSON();
        const stageAmount = ethers.utils.bigNumberify(amount);

        let latestDriipBalance;
        let driipSettlementStageAmount;
        let nullSettlementStageAmount;

        let requiredChallenges = [];
        let allowedChallenges = [];
        const latestReceipt = await this.getLatestReceiptForSettlement(walletAddress, currency.ct);

        try {
            allowedChallenges = await this.checkStartChallenge(stageMonetaryAmount, latestReceipt, walletAddress);
            if (!allowedChallenges.length)
                return requiredChallenges;
        } catch (error) {} //eslint-disable-line

        if (allowedChallenges.length === 1) {
            const allowedChallenge = allowedChallenges[0];
            if (allowedChallenge === 'null') {
                return [{
                    type: 'null',
                    stageMonetaryAmount
                }];
            }
            if (allowedChallenge === 'payment-driip') {
                return [{
                    type: 'payment-driip',
                    stageMonetaryAmount,
                    receipt: latestReceipt
                }];
            }
        }

        if (caseInsensitiveCompare(latestReceipt.sender.wallet, walletAddress))
            latestDriipBalance = ethers.utils.bigNumberify(latestReceipt.sender.balances.current);

        if (caseInsensitiveCompare(latestReceipt.recipient.wallet, walletAddress))
            latestDriipBalance = ethers.utils.bigNumberify(latestReceipt.recipient.balances.current);

        if (ethers.utils.bigNumberify(stageAmount).gt(latestDriipBalance)) {
            driipSettlementStageAmount = latestDriipBalance;
            nullSettlementStageAmount = stageAmount.sub(latestDriipBalance);
            requiredChallenges = [{
                type: 'payment-driip',
                receipt: latestReceipt,
                stageMonetaryAmount: new MonetaryAmount(driipSettlementStageAmount, currency.ct, currency.id)
            }, {
                type: 'null',
                stageMonetaryAmount: new MonetaryAmount(nullSettlementStageAmount, currency.ct, currency.id)
            }];
        }
        else {
            requiredChallenges = [{
                type: 'payment-driip',
                receipt: latestReceipt,
                stageMonetaryAmount
            }];
        }

        return requiredChallenges;
    }

    /**
     * Returns which type of new challenges can be started
     * @param {MonetaryAmount} stageMonetaryAmount - The intended stage amount
     * @param {JSON|null} latestReceipt - The receipt object for driip settlement
     * @param {Address} walletAddress - The wallet address
     * @returns {Promise} A promise that resolves into an array representing which types of new challenges can be started.
     */
    async checkStartChallenge(stageMonetaryAmount, latestReceipt, walletAddress) {
        const provider = _provider.get(this);
        const driipSettlement = _driipSettlement.get(this);
        const nullSettlement = _nullSettlement.get(this);

        let allowedChallenges = [];
        try {
            await driipSettlement.checkStartChallengeFromPayment(Receipt.from(latestReceipt, provider), walletAddress);
            allowedChallenges.push('payment-driip');
        } catch (error) {} //eslint-disable-line
        try {
            await nullSettlement.checkStartChallenge(stageMonetaryAmount, walletAddress);
            allowedChallenges.push('null');
        } catch (error) {} //eslint-disable-line

        return allowedChallenges;
    }

    /**
     * Determine which types of challenges are qualified for staging and return the intended stage amounts accordingly.
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into an array determine which types of challenges are qualified for staging and return the intended stage amounts accordingly.
     */
    async getSettleableChallenges(address, ct, id) {
        const provider = _provider.get(this);
        const driipSettlement = _driipSettlement.get(this);
        const nullSettlement = _nullSettlement.get(this);

        const setteableChallenges = [];
        try {
            const nonce = await driipSettlement.getCurrentProposalNonce(address, ct, id);
            const stageAmount = await driipSettlement.getCurrentProposalStageAmount(address, ct, id);
            const challengedReceipt = (await provider.getWalletReceipts(address, nonce.toNumber(), 1))[0];

            await driipSettlement.checkSettleDriipAsPayment(Receipt.from(challengedReceipt, provider), address);

            setteableChallenges.push({
                type: 'payment-driip',
                receipt: challengedReceipt,
                intendedStageAmount: new MonetaryAmount(stageAmount, ct, id)
            });
        } catch (error) {} //eslint-disable-line

        try {
            const stageAmount = await nullSettlement.getCurrentProposalStageAmount(address, ct, id);
            await nullSettlement.checkSettleNull(address, ct, id);
            setteableChallenges.push({
                type: 'null',
                intendedStageAmount: new MonetaryAmount(stageAmount, ct, id)
            });
        } catch (error) {} //eslint-disable-line

        return setteableChallenges;
    }

    /**
     * Return the ongoing challenges, with the corresponding expiration times and intended stage amount.
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into an array representing the ongoing challenges, with the corresponding expiration times and intended stage amount.
     */
    async getOngoingChallenges(address, ct, id) {
        const driipSettlement = _driipSettlement.get(this);
        const nullSettlement = _nullSettlement.get(this);

        const driipExpirationTime = await driipSettlement.getCurrentProposalExpirationTime(address, ct, id);
        const nullExpirationTime = await nullSettlement.getCurrentProposalExpirationTime(address, ct, id);

        const ongoingChallenges = [];
        let currentTime = new Date().getTime();
        if (driipExpirationTime) {
            const expirationTime = driipExpirationTime.toNumber() * 1000;
            if (expirationTime > currentTime) {
                const intendedStageAmount = await driipSettlement.getCurrentProposalStageAmount(address, ct, id);
                const stageMonetaryAmount = new MonetaryAmount(intendedStageAmount, ct, id);
                ongoingChallenges.push({
                    type: 'payment-driip',
                    expirationTime,
                    intendedStageAmount: stageMonetaryAmount
                });
            }
        }
        if (nullExpirationTime) {
            const expirationTime = nullExpirationTime.toNumber() * 1000;
            if (expirationTime > currentTime) {
                const intendedStageAmount = await nullSettlement.getCurrentProposalStageAmount(address, ct, id);
                const stageMonetaryAmount = new MonetaryAmount(intendedStageAmount, ct, id);
                ongoingChallenges.push({
                    type: 'null',
                    expirationTime,
                    intendedStageAmount: stageMonetaryAmount
                });
            }
        }
        return ongoingChallenges;
    }

    /**
     * Return max expiration time for the ongoing challenges.
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into an integer representing max expiration time for the ongoing challenges.
     */
    async getMaxChallengesTimeout(address, ct, id) {
        const ongoingChallenges = await this.getOngoingChallenges(address, ct, id);
        if (!ongoingChallenges.length)
            return null;

        return ongoingChallenges.sort((a, b) => {
            return b.expirationTime - a.expirationTime;
        })[0].expirationTime;
    }

    /**
     * Return the latest receipt made in a currency under a wallet.
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @returns {Promise} A promise that resolves into an receipt.
     */
    async getLatestReceiptForSettlement(address, ct) {
        const provider = _provider.get(this);
        const receipts = await provider.getWalletReceipts(address, null, 100);
        const filteredReceipts = receipts.filter(r => r.currency.ct === ct).sort((a, b) => b.nonce - a.nonce);
        return filteredReceipts.length ? filteredReceipts[0] : null;
    }

    /**
     * Start challenge based on the parameter object generated by #getRequiredChallengesForIntendedStageAmount.
     * @param {RequiredChallenge} requiredChallenge - The object stores the necessary parameters for starting a settlement challenge.
     * @param {Wallet} wallet - The wallet to start challenge
     * @param [options]
     * @returns {Promise} A promise that resolves into an transaction object.
     */
    async startByRequiredChallenge(requiredChallenge, wallet, options) {
        const driipSettlement = _driipSettlement.get(this);
        const nullSettlement = _nullSettlement.get(this);
        const {type, receipt, stageMonetaryAmount} = requiredChallenge;

        if (type === 'null')
            return await nullSettlement.startChallenge(wallet, stageMonetaryAmount, options);
            
        if (type === 'payment-driip') {
            const nahmiiReceipt = Receipt.from(receipt, wallet);
            return await driipSettlement.startChallengeFromPayment(nahmiiReceipt, stageMonetaryAmount, wallet, options);
        }
    }

    /**
     * Settle a qualified settlement based on the parameter object generated by #getSettleableChallenges.
     * @param {SettleableChallenge} settleableChallenge - The object stores the necessary parameters for settling a qualified settlement challenge.
     * @param {Wallet} wallet - The wallet to start challenge
     * @param [options]
     * @returns {Promise} A promise that resolves into an transaction object.
     */
    async settleBySettleableChallenge(settleableChallenge, wallet, options) {
        const driipSettlement = _driipSettlement.get(this);
        const nullSettlement = _nullSettlement.get(this);
        const {type, receipt, intendedStageAmount} = settleableChallenge;
        const {currency} = intendedStageAmount.toJSON();

        if (type === 'null')
            return await nullSettlement.settleNull(wallet, currency.ct, parseInt(currency.id), options);
            
        if (type === 'payment-driip') {
            const nahmiiReceipt = Receipt.from(receipt, wallet);
            return await driipSettlement.settleDriipAsPayment(nahmiiReceipt, wallet, options);
        }
    }

    /**
     * Start required settlement challenges based the intended stage amount for a currency.
     * @param {MonetaryAmount} stageMonetaryAmount - The intended stage amount
     * @param {Wallet} wallet - The nahmii wallet object
     * @param [options]
     * @returns {Promise} A promise that resolves into an array representing the started challenges, with the confirmed transaction object and intended stage amount accordingly.
     */
    async startChallenge(stageMonetaryAmount, wallet, options = {}) {
        const provider = _provider.get(this);
        const requiredChallenges = await this.getRequiredChallengesForIntendedStageAmount(stageMonetaryAmount, wallet.address);
        const txs = [];
        for (let requiredChallenge of requiredChallenges) {
            const {type, stageMonetaryAmount} = requiredChallenge;
            const currentTx = await this.startByRequiredChallenge(requiredChallenge, wallet, options);

            try {
                const txReceipt = await provider.getTransactionConfirmation(currentTx.hash, 300);
                txs.push({tx: txReceipt, type, intendedStageAmount: stageMonetaryAmount});
            } catch (error) {
                throw new Error(`Sent request to start ${type} settlement challenge: Failed to confirm transaction ${currentTx.hash}`);
            }
        }

        return txs;
    }

    /**
     * Settle the qualified challenges for a currency.
     * @param {MonetaryAmount} stageMonetaryAmount - The intended stage amount
     * @param {Wallet} wallet - The nahmii wallet object
     * @param [options]
     * @returns {Promise} A promise that resolves into an array representing the settled challenges, with the confirmed transaction object and intended stage amount accordingly.
     */
    async settle(ct, id, wallet, options = {}) {
        const provider = _provider.get(this);
        const settleableChallenges = await this.getSettleableChallenges(wallet.address, ct, id);
        const txs = [];
        for (let settleableChallenge of settleableChallenges) {
            const {type, intendedStageAmount} = settleableChallenge;
            const currentTx = await this.settleBySettleableChallenge(settleableChallenge, wallet, options);

            try {
                const txReceipt = await provider.getTransactionConfirmation(currentTx.hash, 300);
                txs.push({tx: txReceipt, type, intendedStageAmount});
            } catch (error) {
                throw new Error(`Sent request to stage ${type} settlement: Failed to confirm transaction ${currentTx.hash}`);
            }
        }

        return txs;
    }
}

module.exports = Settlement;
