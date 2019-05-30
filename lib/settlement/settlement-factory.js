'use strict';

/**
 * @module nahmii-sdk
 */

const ethers = require('ethers');
const {determineNonceFromReceipt} = require('./utils');
const DriipSettlement = require('./driip-settlement');
const PaymentSettlement = require('./payment-settlement');
const ContinuousSettlement = require('./continuous-settlement');
const NullSettlement = require('./null-settlement');
const Receipt = require('../receipt');
const MonetaryAmount = require('../monetary-amount');
const NestedError = require('../nested-error');
const {caseInsensitiveCompare} = require('../utils');

const _provider = new WeakMap();
const _driipSettlement = new WeakMap();
const _nullSettlement = new WeakMap();

/**
 * @class SettlementFactory
 * A class for encapsulating the operations of settlements in different types.
 * @alias module:nahmii-sdk
 */
class SettlementFactory {
    /**
     * Constructor
     * @param {NahmiiProvider} provider - A NahmiiProvider instance
     */
    constructor(provider) {
        _provider.set(this, provider);
        _driipSettlement.set(this, new DriipSettlement(provider));
        _nullSettlement.set(this, new NullSettlement(provider));
    }

    get provider() {
        return _provider.get(this);
    }

    /**
     * Determine which types of challenges can be started and calculate the intended stage amount accordingly.
     * @param {Address} walletAddress - The wallet address
     * @param {MonetaryAmount} stageMonetaryAmount - The intended stage amount
     * @returns {Promise} A promise that resolves into an array determine which types of challenges can be started and calculate the intended stage amount accordingly.
     */
    async calculateRequiredSettlements(walletAddress, stageMonetaryAmount) {
        try {
            const {amount, currency} = stageMonetaryAmount.toJSON();
            const stageAmount = ethers.utils.bigNumberify(amount);

            const allowedSettlements = await this.getAllowedSettlementTypes(walletAddress, stageMonetaryAmount);
            if (!allowedSettlements.length)
                throw new Error('No allowed settlement available to start with.');

            if (allowedSettlements.length === 1) {
                const {SettlementClass} = allowedSettlements[0];
                const newSettlement = await SettlementClass.create(walletAddress, currency.ct, stageAmount, this.provider);
                return [newSettlement];
            }

            let remainingIntendedAmount = stageAmount;
            let newSettlements = [];
            for (const {SettlementClass, maxStageAmount} of allowedSettlements) {
                if (remainingIntendedAmount.eq(0)) 
                    break;
                
                let newSettlement;
                if (maxStageAmount && remainingIntendedAmount.gt(maxStageAmount)) {
                    newSettlement = await SettlementClass.create(walletAddress, currency.ct, maxStageAmount, this.provider);
                    remainingIntendedAmount = remainingIntendedAmount.sub(maxStageAmount);
                }
                else {
                    newSettlement = await SettlementClass.create(walletAddress, currency.ct, remainingIntendedAmount, this.provider);
                    remainingIntendedAmount = ethers.utils.bigNumberify(0);
                }
                newSettlements.push(newSettlement);
            }

            return newSettlements;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to calculate required settlements for the intended stage amount.');
        }
    }

    async getAllSettlements(walletAddress, ct) {
        const settlements = await Promise.all([
            PaymentSettlement.load(walletAddress, ct, this.provider),
            ContinuousSettlement.load(walletAddress, ct, this.provider)
        ]);
        return settlements.filter(settlement => settlement !== null);
    }

    /**
     * Returns which type of new challenges can be started
     * @param {Address} walletAddress - The wallet address
     * @param {MonetaryAmount} stageMonetaryAmount - The intended stage amount
     * @returns {Promise} A promise that resolves into an array representing which types of new challenges can be started.
     */
    async getAllowedSettlementTypes(walletAddress, stageMonetaryAmount) {
        const provider = _provider.get(this);
        const allowedSettlements = [];

        try {
            const {amount, currency} = stageMonetaryAmount.toJSON();
            const tokenInfo = await provider.getTokenInfo(currency.ct, true);

            const stageAmountBN = ethers.utils.bigNumberify(amount);

            const balances = await provider.getNahmiiBalances(walletAddress);
            const balance = balances.find(bal => caseInsensitiveCompare(bal.currency.ct, currency.ct));
            const balanceAvailableBN = ethers.utils.bigNumberify(balance.amountAvailable);

            if (balanceAvailableBN.lt(stageAmountBN))
                throw new Error(`The maximum allowable stage balance is ${ethers.utils.formatUnits(balanceAvailableBN, tokenInfo.decimals)}`);

            const paymentSettlementCheck = await PaymentSettlement.checkForCreate(walletAddress, currency.ct, provider);
            if (paymentSettlementCheck.canStart) {
                allowedSettlements.push({
                    maxStageAmount: paymentSettlementCheck.maxStageAmount,
                    SettlementClass: PaymentSettlement
                });
            }

            const continuousSettlementCheck = await ContinuousSettlement.checkForCreate(walletAddress, currency.ct, provider);
            if (!continuousSettlementCheck.canStart) 
                return [];
            else 
                allowedSettlements.push({SettlementClass: ContinuousSettlement});
            
            return allowedSettlements;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to check if it can start new challenges.');
        }
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

        const settleableChallenges = [];
        const invalidReasons = [];

        try {
            let stageAmount;
            const nonce = await driipSettlement.getCurrentProposalNonce(address, ct, id);
            if (nonce) {
                const allWalletReceipts = await provider.getWalletReceipts(address);
                const challengedReceipt = allWalletReceipts.find(r => determineNonceFromReceipt(r, address) === nonce.toNumber());
                stageAmount = await driipSettlement.getCurrentProposalStageAmount(address, ct, id);
                if (challengedReceipt) {
                    const settlePaymentChecks = await driipSettlement.checkSettleDriipAsPayment(Receipt.from(challengedReceipt, provider), address);
                    if (settlePaymentChecks.valid) {
                        settleableChallenges.push({
                            type: 'payment-driip',
                            receipt: challengedReceipt,
                            intendedStageAmount: MonetaryAmount.from(stageAmount, ct, id)
                        });
                    }
                    else {
                        invalidReasons.push({type: 'payment-driip', reasons: settlePaymentChecks.reasons});
                    }
                }
            }

            stageAmount = await nullSettlement.getCurrentProposalStageAmount(address, ct, id);
            const settleNullChecks = await nullSettlement.checkSettleNull(address, ct, id);
            if (settleNullChecks.valid) {
                settleableChallenges.push({
                    type: 'null',
                    intendedStageAmount: MonetaryAmount.from(stageAmount, ct, id)
                });
            }
            else {
                invalidReasons.push({type: 'null', reasons: settleNullChecks.reasons});
            }

            return {settleableChallenges, invalidReasons};
        }
        catch (error) {
            throw new NestedError(error, 'Unable to get settleable challenges.');
        }
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

        try {
            const [driipExpirationTime, nullExpirationTime] = await Promise.all([
                driipSettlement.getCurrentProposalExpirationTime(address, ct, id),
                nullSettlement.getCurrentProposalExpirationTime(address, ct, id)
            ]);
            const ongoingChallenges = [];
            const currentTime = new Date().getTime();
            if (driipExpirationTime) {
                const expirationTime = driipExpirationTime.toNumber() * 1000;
                if (expirationTime > currentTime) {
                    const intendedStageAmount = await driipSettlement.getCurrentProposalStageAmount(address, ct, id);
                    const stageMonetaryAmount = MonetaryAmount.from(intendedStageAmount, ct, id);
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
                    const stageMonetaryAmount = MonetaryAmount.from(intendedStageAmount, ct, id);
                    ongoingChallenges.push({
                        type: 'null',
                        expirationTime,
                        intendedStageAmount: stageMonetaryAmount
                    });
                }
            }
            return ongoingChallenges;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to get ongoing challenges.');
        }
    }

    /**
     * Return max expiration time for the ongoing challenges.
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into an integer representing max expiration time for the ongoing challenges.
     */
    async getMaxChallengesTimeout(address, ct, id) {
        try {
            const ongoingChallenges = await this.getOngoingChallenges(address, ct, id);
            if (!ongoingChallenges.length)
                return null;

            return ongoingChallenges.sort((a, b) => {
                return b.expirationTime - a.expirationTime;
            })[0].expirationTime;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to get the max timeout for the ongoing challenges.');
        }
    }

    /**
     * Return the latest receipt made in a currency under a wallet.
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @returns {Promise} A promise that resolves into an receipt.
     */
    async getLatestReceiptForSettlement(address, ct) {
        const provider = _provider.get(this);
        try {
            const receipts = await provider.getWalletReceipts(address, null, 100);
            const filteredReceipts = receipts
                .filter(r => caseInsensitiveCompare(r.currency.ct, ct))
                .sort((a, b) => determineNonceFromReceipt(b, address) - determineNonceFromReceipt(a, address));
            return filteredReceipts.length ? filteredReceipts[0] : null;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to get the latest receipt for a settlement.');
        }
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
        try {
            const {type, receipt, stageMonetaryAmount} = requiredChallenge;
            if (type === 'null')
                return await nullSettlement.startChallenge(wallet, stageMonetaryAmount, options);

            if (type === 'payment-driip') {
                const nahmiiReceipt = Receipt.from(receipt, wallet);
                return await driipSettlement.startChallengeFromPayment(nahmiiReceipt, stageMonetaryAmount, wallet, options);
            }
        }
        catch (error) {
            throw new NestedError(error, 'Unable to start a required challenge');
        }
    }

    /**
     * Stop an ongoing challenge.
     * @param {OngoingChallenge} ongoingChallenge - The ongoing settlement challenge to be stopped.
     * @param {Wallet} wallet - The wallet to stop challenge
     * @param [options]
     * @returns {Promise} A promise that resolves into an transaction object.
     */
    async stopByOngoingChallenge(ongoingChallenge, wallet, options) {
        const driipSettlement = _driipSettlement.get(this);
        const nullSettlement = _nullSettlement.get(this);
        try {
            const {type, intendedStageAmount} = ongoingChallenge;
            const {currency} = intendedStageAmount.toJSON();
            if (type === 'null')
                return await nullSettlement.stopChallenge(wallet, currency.ct, parseInt(currency.id), options);

            if (type === 'payment-driip')
                return await driipSettlement.stopChallenge(wallet, currency.ct, parseInt(currency.id), options);
        }
        catch (error) {
            throw new NestedError(error, 'Unable to stop a challenge');
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
        try {
            const {type, receipt, intendedStageAmount} = settleableChallenge;
            const {currency} = intendedStageAmount.toJSON();

            if (type === 'null')
                return await nullSettlement.settleNull(wallet, currency.ct, parseInt(currency.id), options);

            if (type === 'payment-driip') {
                const nahmiiReceipt = Receipt.from(receipt, wallet);
                return await driipSettlement.settleDriipAsPayment(nahmiiReceipt, wallet, options);
            }
        }
        catch (error) {
            throw new NestedError(error, 'Unable to settle a challenge.');
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
        try {
            const {requiredChallenges} = await this.getRequiredChallengesForIntendedStageAmount(stageMonetaryAmount, wallet.address);
            const txs = [];
            for (let requiredChallenge of requiredChallenges) {
                const {type, stageMonetaryAmount} = requiredChallenge;
                const currentTx = await this.startByRequiredChallenge(requiredChallenge, wallet, options);

                try {
                    const txReceipt = await provider.getTransactionConfirmation(currentTx.hash, 300);
                    txs.push({tx: txReceipt, type, intendedStageAmount: stageMonetaryAmount});
                }
                catch (error) {
                    throw new Error(`Sent request to start ${type} settlement challenge: Failed to confirm transaction ${currentTx.hash}`);
                }
            }

            return txs;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to start a new challenge.');
        }
    }

    /**
     * Stop all ongoing challenges.
     * @param {Wallet} wallet - The nahmii wallet object
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @param [options]
     * @returns {Promise} A promise that resolves into an array representing the stopped challenges, with the confirmed transaction object and the challenge type.
     */
    async stopChallenges(wallet, ct, id, options = {}) {
        const provider = _provider.get(this);
        try {
            const ongoingChallenges = await this.getOngoingChallenges(wallet.address, ct, id);
            const txs = [];
            for (let ongoingChallenge of ongoingChallenges) {
                const {type} = ongoingChallenge;
                const currentTx = await this.stopByOngoingChallenge(ongoingChallenge, wallet, options);

                try {
                    const txReceipt = await provider.getTransactionConfirmation(currentTx.hash, 300);
                    txs.push({tx: txReceipt, type});
                }
                catch (error) {
                    throw new Error(`Sent request to stop ${type} settlement challenge: Failed to confirm transaction ${currentTx.hash}`);
                }
            }

            return txs;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to stop a challenge.');
        }
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
        try {
            const {settleableChallenges} = await this.getSettleableChallenges(wallet.address, ct, id);
            const txs = [];
            for (let settleableChallenge of settleableChallenges) {
                const {type, intendedStageAmount} = settleableChallenge;
                const currentTx = await this.settleBySettleableChallenge(settleableChallenge, wallet, options);

                try {
                    const txReceipt = await provider.getTransactionConfirmation(currentTx.hash, 300);
                    txs.push({tx: txReceipt, type, intendedStageAmount});
                }
                catch (error) {
                    throw new Error(`Sent request to stage ${type} settlement: Failed to confirm transaction ${currentTx.hash}`);
                }
            }

            return txs;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to settle a challenge');
        }
    }
}

module.exports = SettlementFactory;
