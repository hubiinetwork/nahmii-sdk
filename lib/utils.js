'use strict';

const Web3Utils = require('web3-utils');
const ethutil = require('ethereumjs-util');
const get = require('lodash.get');

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
    let expandedPropertyNames;
    try {
        expandedPropertyNames = expandPropertyNameGlobs(obj, propertyNameGlobs);
    }
    catch(err) {
        if (err instanceof GlobExpandError)
            throw new Error(`Cannot hash object: Expected property "${err.pattern}" does not exist on object.`);
        else
            throw err;
    }
    const propertyValues = expandedPropertyNames.map(path => {
        const value = getNestedProperty(obj, path);
        if (value === undefined)
            throw new Error(`Cannot hash object: Expected property "${path}" does not exist on object.`);
        return value;
    });
    return hash(...propertyValues);
}

class GlobExpandError extends Error {
    constructor(message, pattern) {
        super(message);
        this.pattern = pattern;
    }
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
        let indexOfGlob = pattern.indexOf('*');
        if (indexOfGlob === -1) {
            result.push(pattern);
        } else {
            const arrayPropName = pattern.substring(0, indexOfGlob - 1);
            const arrayProp = getNestedProperty(object, arrayPropName);
            if (!arrayProp)
                throw new GlobExpandError(`No property matching "${pattern}"`, pattern);

            if (!(arrayProp instanceof Array))
                throw new GlobExpandError(`Property matching "${pattern}" is not an array`, pattern);

            arrayProp.forEach((v, i) => {
                const pp = `${arrayPropName}[${i}]`;
                if (indexOfGlob < pattern.length - 1)
                    result.push(pp + pattern.substring(indexOfGlob + 1));
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
    return get(obj, propertyPath);
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
 * Takes a flat format RPC signature and returns it in expanded form, with
 * s, r in hex string form, and v a number 
 * @param {String} Flat form signature
 * @returns {Object} Expanded form signature
 */
function fromRpcSig(flatSig) {
    const expandedSig = ethutil.fromRpcSig(flatSig);

    return {
        s: ethutil.bufferToHex(expandedSig.s),
        r: ethutil.bufferToHex(expandedSig.r),
        v: expandedSig.v 
    };
}

/**
 * Re-hashes a message as an Ethereum message hash.
 * @private
 * @param {String} message - hexadecimal string
 * @returns {String} hexadecimal string
 */
function ethHash(message) {
    const m = message.toString('hex');
    return hash('\x19Ethereum Signed Message:\n32', m);
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
        r: prefix0x(signature.r.toString('hex')),
        s: prefix0x(signature.s.toString('hex'))
    };
}

function recover(message, signature) {
    const messageBuffer = new Buffer(strip0x(message), 'hex');
    const v = parseInt(signature.v);
    const r = new Buffer(strip0x(signature.r), 'hex');
    const s = new Buffer(strip0x(signature.s), 'hex');
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
        const ethMessage = ethHash(message);
        return caseInsensitiveCompare(recoverAddress(ethMessage, signature), prefix0x(address));
    } catch (e) {
        return false;
    }
}

/**
 * @exports nahmii-sdk/utils
 */
module.exports = {
    prefix0x,
    strip0x,
    fromRpcSig,
    hash,
    hashObject,
    sign,
    isSignedBy
};
