'use strict';

const {isRevertContractException} = require('./utils');
const NahmiiContract = require('../contract');
const NestedError = require('../nested-error');

class DriipSettlementContract extends NahmiiContract {
    constructor(walletOrProvider) {
        super('DriipSettlementByPayment', walletOrProvider);
    }

    /**
     * Returns settlement details object. 
     * @param {EthereumAddress} address - The wallet address.
     * @param {number} nonce - The nonce that this function queries for.
     * @returns {Promise} A promise that resolves into the settlement details object.
     * @example
     * let settlement = await driipSettlement.settlementByWalletAndNonce(EthereumAddress.from('0x0000000000000000000000000000000000000001'), 1);
     */
    async getSettlementByNonce(address, nonce) {
        try {
            const settlement = await this.settlementByWalletAndNonce(address.toString(), nonce);
            return settlement;
        }
        catch (err) {
            if (isRevertContractException(err)) 
                return null;
            
            throw new NestedError(err, 'Unable to get the settlement object by nonce.');
        }
    }
}

module.exports = DriipSettlementContract;
