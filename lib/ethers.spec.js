'use strict';

const chai = require('chai');
const sinon = require('sinon');
chai.use(require('sinon-chai'));

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const fakeEthers = {
    errors: {
        setLogLevel: sinon.spy()
    }
};

describe('ethers', () => {
    describe('when environment log level is set', () => {
        before(() => {
            process.env.LOG_LEVEL = 'some log level';
        });

        after(() => {
            delete process.env.LOG_LEVEL;
        });

        it('should set the log level of ethers to the one of environment variable', () => {
            const ethers = proxyquire('./ethers', {'ethers': fakeEthers});
            ethers.errors.setLogLevel.should.have.been.calledWith(process.env.LOG_LEVEL);
        });
    });

    describe('when environment log level is not set', () => {
        it('should set the log level of ethers to default value of \'error\'', () => {
            const ethers = proxyquire('./ethers', {'ethers': fakeEthers});
            ethers.errors.setLogLevel.should.have.been.calledWith('error');
        });
    });
});