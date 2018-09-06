'use strict';

const Web3Utils = require('web3-utils');
const ethutil = require('ethereumjs-util');
const pluck = require('pluck');

/**
 * Hash according to {@link https://en.wikipedia.org/wiki/SHA-3|sha3 (aka keccak-256)}
 * @param args
 * @return {String} 32 byte hash value as hex
 */
function hash(...args) {
    return Web3Utils.soliditySha3(...args);
}

/**
 * Plucks properties from an object, and hashes them according to {@link https://en.wikipedia.org/wiki/SHA-3|sha3 (aka keccak-256)}
 * @param {Object} obj
 * @param {String[]} propertyNameGlobs
 * @return {String} 32 byte hash value as hex
 */
function hashObject(obj, propertyNameGlobs) {
    const expandedPropertyNames = expandPropertyNameGlobs(obj, propertyNameGlobs);
    const propertyValues = expandedPropertyNames.map(path => {
        const value = getNestedProperty(obj, path);
        if (value === undefined)
            throw new Error(`Cannot hash object: Expected property "${path}" does not exist on object.`);
        return value;
    });
    return hash(...propertyValues);
}

/**
 * Takes an array of property patterns and expands any glob pattern it finds
 * based on the provided object.
 * @private
 * @param object
 * @param globPatterns
 * @returns {Array}
 */
function expandPropertyNameGlobs(object, globPatterns) {
    const result = [];
    for (let pattern of globPatterns) {
        if (pattern.indexOf('*') === -1)
            result.push(pattern);
        else {
            let arrayPropName = pattern.substring(0, pattern.indexOf('*') - 1);
            let arrayProp = getNestedProperty(object, arrayPropName);
            arrayProp.forEach((v, i) => {
                let pp = arrayPropName + '[' + i + ']';
                if (pattern.indexOf('*') < pattern.length - 1)
                    result.push(pp + pattern.substring(pattern.indexOf('*') + 1));
                else if (typeof v === 'object')
                    Object.getOwnPropertyNames(v).forEach(n => result.push(`${pp}.${n}`));
                else
                    result.push(pp);
            });
        }
    }
    return result;
}

function getNestedProperty(obj, propertyPath) {
    return pluck(propertyPath)(obj);
}

/**
 * Make sure the string provided has a 0x prefix
 * @param str
 * @returns {String} Input prefixed with 0x if not already present.
 */
function prefix0x(str) {
    if (!str)
        return str;
    if (typeof(str) !== 'string')
        return str;

    return '0x' + strip0x(str);
}

/**
 * Removes 0x from the start of the string if present.
 * @param str
 * @returns {String} Input without any 0x prefix.
 */
function strip0x(str) {
    if (!str)
        return str;
    if (typeof(str) !== 'string')
        return str;

    return str.replace(/^(0x)+/i, '');
}

/**
 * Re-hashes a message as an Ethereum message hash.
 * @param {String} message - hexadecimal string
 * @returns {String} hexadecimal string
 */
function ethHash(message) {
    const m = strip0x(message);
    return hash('\x19Ethereum Signed Message:\n' + m.length + m);
}

/**
 * Creates a signature for the specified message the Ethereum way according to
 * {@link https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sign|eth_sign}
 * @param {String} message - hexadecimal string
 * @param {String} privateKey - hexadecimal string
 * @returns {Object} Signature as an object literal with r, s and v properties.
 */
function sign(message, privateKey) {
    let ethMessage = ethHash(message);
    let pk = new Buffer(strip0x(privateKey), 'hex');
    const ethMessageBuf = new Buffer(strip0x(ethMessage), 'hex');
    const signature = ethutil.ecsign(ethMessageBuf, pk);
    return {
        v: signature.v,
        r: signature.r.toString('hex'),
        s: signature.s.toString('hex')
    };
}

function recover(message, signature) {
    const messageBuffer = new Buffer(strip0x(message), 'hex');
    const v = parseInt(signature.v);
    const r = new Buffer(signature.r, 'hex');
    const s = new Buffer(signature.s, 'hex');
    return ethutil.ecrecover(messageBuffer, v, r, s);
}

function recoverAddress(message, signature) {
    const pubKeyBuf = recover(message, signature);
    const addrBuf = ethutil.pubToAddress(pubKeyBuf);
    return prefix0x(addrBuf.toString('hex'));
}

function caseInsensitiveCompare(a, b) {
    return a.localeCompare(b, 'en', {sensitivity: 'base'}) === 0;
}

/**
 * Checks whether or not the address is the address of the private key used to
 * sign the specified message and signature.
 * @param {String} message - A message hash as a hexadecimal string
 * @param {Object} signature - The signature of the message given as V, R and S properties
 * @param {String} address - A hexadecimal representation of the address to verify
 * @returns {Boolean} True if address belongs to the signed message
 */
function isSignedBy(message, signature, address) {
    try {
        return caseInsensitiveCompare(recoverAddress(message, signature), prefix0x(address));
    } catch (e) {
        return false;
    }
}

/**
 * @exports striim-sdk/utils
 */
module.exports = {
    prefix0x,
    strip0x,
    hash,
    ethHash,
    hashObject,
    sign,
    isSignedBy
};
