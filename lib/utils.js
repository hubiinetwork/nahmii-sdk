'use strict';

const Web3Utils = require('web3-utils');
const ethutil = require('ethereumjs-util');

/**
 * Hash according to {@link https://en.wikipedia.org/wiki/SHA-3|sha3 (aka keccak-256)}
 * @param args
 * @return {String} 32 byte hash value as hex
 */
function hash(...args) {
    return Web3Utils.soliditySha3(...args);
}

/**
 * Make sure the string provided has a 0x prefix
 * @param str
 * @returns {String} Input prefixed with 0x if not already present.
 */
function prefix0x(str) {
    if (str.startsWith('0x') || str.startsWith('0X'))
        return str;
    return `0x${str}`;
}

/**
 * Removes 0x from the start of the string if present.
 * @param str
 * @returns {String} Input without any 0x prefix.
 */
function strip0x(str) {
    if (str.startsWith('0x') || str.startsWith('0X'))
        str = str.substring(2);
    return str;
}

/**
 * Signs the specified message using the provided private key.
 * @param message
 * @param privateKey
 * @returns {string} Signature as a hexadecimal string.
 */
function sign(message, privateKey) {
    const _msgHash = Buffer.from(strip0x(message), 'hex');
    const _privateKey = Buffer.from(strip0x(privateKey), 'hex');
    const signature = ethutil.ecsign(_msgHash, _privateKey);
    return `0x${signature.v.toString(16)}${signature.r.toString('hex')}${signature.s.toString('hex')}`;
}

module.exports = {
    prefix0x,
    strip0x,
    hash,
    sign
};
