'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const ethers = require('ethers');
const Erc20Contract = require('./erc20-contract');
const NahmiiProvider = require('../nahmii-provider');
const Wallet = require('../wallet');

const provider = new NahmiiProvider('', '', '', '', 'ropsten');
provider.getTokenInfo = sinon.stub();

const wallet = new Wallet('0x' + '0F'.repeat(32), provider);

describe('Erc20Contract', () => {
    afterEach(() => {
        provider.getTokenInfo.reset();
    });

    [
        ['wallet', wallet],
        ['provider', provider]
    ].forEach(([description, walletOrProvider]) => {
        context('using a ' + description, () => {
            context('creating from a supported token', () => {
                let contract;

                beforeEach(async () => {
                    provider.getTokenInfo.withArgs('TT1').resolves({
                        currency: '0x0000000000000000000000000000000000000001',
                        symbol: 'TT1',
                        decimals: 18
                    });
                    contract = await Erc20Contract.from('TT1', walletOrProvider);
                });

                it('is an instance of ethers.Contract', () => {
                    expect(contract).to.be.an.instanceOf(ethers.Contract);
                });

                it('has correct address', () => {
                    expect(contract.address).to.eql('0x0000000000000000000000000000000000000001');
                });

                it('parses with the correct number of decimals', () => {
                    expect(contract.parse('1.0203')).to.eql(ethers.utils.bigNumberify('1020300000000000000'));
                });
            });
        });
    });
});
