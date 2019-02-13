'use strict';

/**
 * Checks whether it is an expected revert contract exception.
 * @param {Error} error - error object thrown by ethers contract funcion call
 * @returns {Boolean} True if it is revert exception thrown by the contract
 */
function isRevertContractException(error) {
    return error.code === 'CALL_EXCEPTION' || error.code === -32000;
}

module.exports = {
    isRevertContractException
};
