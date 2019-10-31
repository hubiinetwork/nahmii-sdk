'use strict';

/**
 * @module nahmii-sdk
 */

const ethers = require('ethers');
const {EthereumAddress} = require('nahmii-ethereum-address');
const MonetaryAmount = require('../monetary-amount');
const Currency = require('../currency');
const PaymentSettlement = require('./payment-settlement');
const OnchainBalanceSettlement = require('./onchain-balance-settlement');
const NestedError = require('../nested-error');

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

    async calculateRequiredSettlements(address, stageMonetaryAmount) {
        try {
            const walletAddress = EthereumAddress.from(address);
            const newSettlements = [];
            const {amount, currency} = stageMonetaryAmount;
            const totalStageAmount = ethers.utils.bigNumberify(amount);
            let residualIntendedAmount = totalStageAmount;

            await validateBalanceAvailable.call(this, walletAddress, stageMonetaryAmount);

            const allowedSettlements = await getAllowedSettlementTypes.call(this, walletAddress, currency);

            for (const {SettlementClass, maxStageAmount} of allowedSettlements) {
                let stageAmount;
                if (maxStageAmount && residualIntendedAmount.gt(maxStageAmount)) 
                    stageAmount = maxStageAmount;
                else 
                    stageAmount = residualIntendedAmount;
                
                const newSettlement = await SettlementClass.create(
                    walletAddress, 
                    MonetaryAmount.from({currency, amount: stageAmount}), 
                    this.provider
                );
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

    async getAllSettlements(address, ct) {
        const walletAddress = EthereumAddress.from(address);
        const currency = Currency.from({ct, id: 0});
        const settlements = await Promise.all([
            PaymentSettlement.load(walletAddress, currency, this.provider),
            OnchainBalanceSettlement.load(walletAddress, currency, this.provider)
        ]);
        return settlements.filter(settlement => settlement);
    }
}

async function validateBalanceAvailable(walletAddress, monetaryAmount) {
    const {currency, amount} = monetaryAmount.toJSON();
    const tokenInfo = await this.provider.getTokenInfo(currency.ct.toString(), true);
    const balances = await this.provider.getNahmiiBalances(walletAddress.toString());
    const balance = balances.find(bal => EthereumAddress.from(bal.currency.ct).isEqual(EthereumAddress.from(currency.ct)));
    const balanceAvailableAmount = ethers.utils.bigNumberify(balance.amountAvailable);

    if (balanceAvailableAmount.lt(amount))
        throw new Error(`The maximum allowable stage balance is ${ethers.utils.formatUnits(balanceAvailableAmount, tokenInfo.decimals)}`);
}

/**
 * Returns which type of new challenges can be started
 * @param {Address} walletAddress - The wallet address
 * @param {Address} ct - The currency address
 * @returns {Promise} A promise that resolves into an array representing which types of new settlements can be started.
 */
async function getAllowedSettlementTypes(walletAddress, currency) {
    const provider = _provider.get(this);
    const allowedSettlements = [];

    const paymentSettlementCheck = await PaymentSettlement.checkForCreate(walletAddress, currency, provider);
    if (paymentSettlementCheck.canStart) {
        allowedSettlements.push({
            maxStageAmount: paymentSettlementCheck.maxStageAmount,
            SettlementClass: PaymentSettlement
        });
    }

    const onchainBalanceSettlementCheck = await OnchainBalanceSettlement.checkForCreate(walletAddress, currency, provider);
    if (!onchainBalanceSettlementCheck.canStart) 
        return [];
    else 
        allowedSettlements.push({SettlementClass: OnchainBalanceSettlement});
    
    return allowedSettlements;
}

module.exports = SettlementFactory;
