'use strict';

const ethers = require('ethers');

ethers.errors.setLogLevel(process.env.LOG_LEVEL || 'error');

module.exports = ethers;
