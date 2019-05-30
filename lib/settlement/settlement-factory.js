'use strict';

/**
 * @module nahmii-sdk
 */

const ethers = require('ethers');
const PaymentSettlement = require('./payment-settlement');
const ContinuousSettlement = require('./continuous-settlement');
const NestedError = require('../nested-error');
const {caseInsensitiveCompare} = require('../utils');

const _provider = new WeakMap();

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
            const newSettlements = [];
            const {amount, currency} = stageMonetaryAmount.toJSON();
            const totalStageAmount = ethers.utils.bigNumberify(amount);
            let remainingIntendedAmount = totalStageAmount;

            await validateBalanceAvailable.call(this, walletAddress, currency.ct, totalStageAmount);

            const allowedSettlements = await getAllowedSettlementTypes.call(this, walletAddress, currency.ct);

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

            if (!remainingIntendedAmount.eq(0))
                throw new Error('Unable to create settlements to cover the full intended stage amount.');

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
     * Determine which types of challenges are qualified for staging and return the intended stage amounts accordingly.
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into an array determine which types of challenges are qualified for staging and return the intended stage amounts accordingly.
     */
    async getStageableSettlements(address, ct) {
        const settlements = await this.getAllSettlements(address, ct);
        return settlements.filter(settlement => settlement.isStageable);
    }

    /**
     * Return the ongoing challenges, with the corresponding expiration times and intended stage amount.
     * @param {Address} address - The wallet address
     * @param {Address} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into an array representing the ongoing challenges, with the corresponding expiration times and intended stage amount.
     */
    async getOngoingSettlements(address, ct) {
        const settlements = await this.getAllSettlements(address, ct);
        return settlements.filter(settlement => settlement.isOngoing);
    }

    async getCompletedSettlements(address, ct) {
        const settlements = await this.getAllSettlements(address, ct);
        return settlements.filter(settlement => settlement.isCompleted);
    }
}

async function validateBalanceAvailable(walletAddress, ct, intendedStageAmount) {
    const tokenInfo = await this.provider.getTokenInfo(ct, true);
    const balances = await this.provider.getNahmiiBalances(walletAddress);
    const balance = balances.find(bal => caseInsensitiveCompare(bal.currency.ct, ct));
    const balanceAvailableAmount = ethers.utils.bigNumberify(balance.amountAvailable);

    if (balanceAvailableAmount.lt(intendedStageAmount))
        throw new Error(`The maximum allowable stage balance is ${ethers.utils.formatUnits(balanceAvailableAmount, tokenInfo.decimals)}`);
}

/**
 * Returns which type of new challenges can be started
 * @param {Address} walletAddress - The wallet address
 * @param {MonetaryAmount} stageMonetaryAmount - The intended stage amount
 * @returns {Promise} A promise that resolves into an array representing which types of new challenges can be started.
 */
async function getAllowedSettlementTypes(walletAddress, ct) {
    const provider = _provider.get(this);
    const allowedSettlements = [];

    try {
        const paymentSettlementCheck = await PaymentSettlement.checkForCreate(walletAddress, ct, provider);
        if (paymentSettlementCheck.canStart) {
            allowedSettlements.push({
                maxStageAmount: paymentSettlementCheck.maxStageAmount,
                SettlementClass: PaymentSettlement
            });
        }

        const continuousSettlementCheck = await ContinuousSettlement.checkForCreate(walletAddress, ct, provider);
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

module.exports = SettlementFactory;
