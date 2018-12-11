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
     * @param {JSON|null} latestReceipt - The receipt object for driip settlement
     * @param {Address} walletAddress - The wallet address
     * @returns {Promise} A promise that resolves into an array determine which types of challenges can be started and calculate the intended stage amount accordingly.
     */
    async getRequiredChallengesForIntendedStageAmount(stageMonetaryAmount, latestReceipt, walletAddress) {
        const {amount, currency} = stageMonetaryAmount.toJSON();
        const stageAmount = ethers.utils.bigNumberify(amount);

        let latestDriipBalance;
        let driipSettlementStageAmount;
        let nullSettlementStageAmount;

        let requiredChallenges = [];
        let allowedChallenges = [];
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
        } else {
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
            await driipSettlement.checkStartChallengeFromPayment(Receipt.from(provider, latestReceipt), walletAddress);
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
            const receipts = await provider.getWalletReceipts(address, null, 100);
            const challengedReceipt = receipts.filter(r => r.nonce === nonce.toNumber())[0];
            await driipSettlement.checkSettleDriipAsPayment(Receipt.from(provider, challengedReceipt), address);

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
     * Start required settlement challenges based the intended stage amount for a currency.
     * @param {MonetaryAmount} stageMonetaryAmount - The intended stage amount
     * @param {Wallet} wallet - The nahmii wallet object
     * @param [options]
     * @returns {Promise} A promise that resolves into an array representing the started challenges, with the broadcasted transaction object and intended stage amount accordingly.
     */
    async startChallenge(stageMonetaryAmount, wallet, options = {}) {
        const provider = _provider.get(this);
        const driipSettlement = _driipSettlement.get(this);
        const nullSettlement = _nullSettlement.get(this);
        const {currency} = stageMonetaryAmount.toJSON();
        const receipts = await provider.getWalletReceipts(wallet.address, null, 100);
        const latestReceipt = receipts.filter(r => r.currency.ct === currency.ct)[0];
        const requiredChallenges = await this.getRequiredChallengesForIntendedStageAmount(stageMonetaryAmount, latestReceipt, wallet.address);
        const txs = [];
        for (let requiredChallenge of requiredChallenges) {
            const {type, receipt, stageMonetaryAmount} = requiredChallenge;
            let tx;
            if (type === 'null') 
                tx = await nullSettlement.startChallenge(wallet, stageMonetaryAmount, options);
            
            if (type === 'payment-driip') 
                tx = await driipSettlement.startChallengeFromPayment(Receipt.from(wallet, receipt), stageMonetaryAmount, wallet, options);

            txs.push({tx, type, intendedStageAmount: stageMonetaryAmount});
        }

        return txs;
    }

    /**
     * Settle the qualified challenges for a currency.
     * @param {MonetaryAmount} stageMonetaryAmount - The intended stage amount
     * @param {Wallet} wallet - The nahmii wallet object
     * @param [options]
     * @returns {Promise} A promise that resolves into an array representing the settled challenges, with the broadcasted transaction object and intended stage amount accordingly.
     */
    async settle(ct, id, wallet, options = {}) {
        const driipSettlement = _driipSettlement.get(this);
        const nullSettlement = _nullSettlement.get(this);

        const settleableChallenges = await this.getSettleableChallenges(wallet.address, ct, id);
        const txs = [];
        for (let settleableChallenge of settleableChallenges) {
            const {type, receipt, intendedStageAmount} = settleableChallenge;
            let tx;
            if (type === 'null') 
                tx = await nullSettlement.settleNull(wallet, ct, id, options);
            
            if (type === 'payment-driip') 
                tx = await driipSettlement.settleDriipAsPayment(Receipt.from(wallet, receipt), wallet, options);
            
            txs.push({tx, type, intendedStageAmount});
        }

        return txs;
    }
}

module.exports = Settlement;
