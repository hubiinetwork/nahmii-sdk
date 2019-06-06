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
 * A class for generating settlement objects.
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

    async calculateRequiredSettlements(walletAddress, stageMonetaryAmount) {
        try {
            const newSettlements = [];
            const {amount, currency} = stageMonetaryAmount.toJSON();
            const totalStageAmount = ethers.utils.bigNumberify(amount);
            let residualIntendedAmount = totalStageAmount;

            await validateBalanceAvailable.call(this, walletAddress, currency.ct, totalStageAmount);

            const allowedSettlements = await getAllowedSettlementTypes.call(this, walletAddress, currency.ct);

            for (const {SettlementClass, maxStageAmount} of allowedSettlements) {
                let stageAmount;
                if (maxStageAmount && residualIntendedAmount.gt(maxStageAmount)) 
                    stageAmount = maxStageAmount;
                else 
                    stageAmount = residualIntendedAmount;
                
                const newSettlement = await SettlementClass.create(walletAddress, currency.ct, stageAmount, this.provider);
                residualIntendedAmount = residualIntendedAmount.sub(stageAmount);
                newSettlements.push(newSettlement);

                if (residualIntendedAmount.eq(0)) 
                    return newSettlements;
            }

            throw new Error('Unable to create settlements to cover the full intended stage amount.');
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
        return settlements.filter(settlement => settlement);
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
 * @param {Address} ct - The currency address
 * @returns {Promise} A promise that resolves into an array representing which types of new settlements can be started.
 */
async function getAllowedSettlementTypes(walletAddress, ct) {
    const provider = _provider.get(this);
    const allowedSettlements = [];

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

module.exports = SettlementFactory;
