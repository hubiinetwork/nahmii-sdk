'use strict';

const chai = require('chai');
const sinonChai = require('sinon-chai');
const nock = require('nock');
const expect = chai.expect;
const batchRpcRequest = require('./batch-rpc-request');
chai.use(sinonChai);

const nodeUrl = 'https://www.ropsten-node.com';
const providerMock = {connection: {url: nodeUrl}};

describe('batchRpcRequest', () => {
    before(() => {
        nock.disableNetConnect();
    });

    after(() => {
        nock.enableNetConnect();
    });

    afterEach(() => {
        nock.cleanAll();
    });
    context('when given a list of params to make a batch call', () => {
        const fromAddress = '0x1175c566af09f40dfd14289ba7b014b1a357b2c1';
        const contractAddress = '0x0d152b9ee87ebae179f64c067a966dd716c50742';
        const functionDesc = 'manyParams(address,uint256,uint8)';
        const paramsList = [
            ['0x1111111111111111111111111111111111111111', 1000, 1], 
            ['0x1111111111111111111111111111111111111112', 2000, 2],
            ['0x1111111111111111111111111111111111111113', 3000, 3]
        ];
        const payload = [{'method':'eth_call','params':[{'from':'0x1175c566af09f40dfd14289ba7b014b1a357b2c1','to':'0x0d152b9ee87ebae179f64c067a966dd716c50742','data':'0x9c77479b000000000000000000000000111111111111111111111111111111111111111100000000000000000000000000000000000000000000000000000000000003e80000000000000000000000000000000000000000000000000000000000000001'},'latest'],'id':42,'jsonrpc':'2.0'},{'method':'eth_call','params':[{'from':'0x1175c566af09f40dfd14289ba7b014b1a357b2c1','to':'0x0d152b9ee87ebae179f64c067a966dd716c50742','data':'0x9c77479b000000000000000000000000111111111111111111111111111111111111111200000000000000000000000000000000000000000000000000000000000007d00000000000000000000000000000000000000000000000000000000000000002'},'latest'],'id':42,'jsonrpc':'2.0'},{'method':'eth_call','params':[{'from':'0x1175c566af09f40dfd14289ba7b014b1a357b2c1','to':'0x0d152b9ee87ebae179f64c067a966dd716c50742','data':'0x9c77479b00000000000000000000000011111111111111111111111111111111111111130000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000003'},'latest'],'id':42,'jsonrpc':'2.0'}];
        it('on success returns the expected payload', async () => {
            const expected = [0, 1, 0];
            nock(nodeUrl)
                .post('/', payload)
                .reply(200, JSON.stringify(expected));
            expect(
                await batchRpcRequest(
                    fromAddress, 
                    contractAddress, 
                    functionDesc, 
                    paramsList,
                    providerMock,
                )
            ).deep.equals(expected);
        });

        it('on invalid JSON response rejects', async () => {
            nock(nodeUrl)
                .post('/', payload)
                .reply(200, 'h"kqj3h');
            expect(
                batchRpcRequest(
                    fromAddress, 
                    contractAddress, 
                    functionDesc, 
                    paramsList,
                    providerMock,
                )
            ).to.be.rejected;
        });

        it('on non-success response code rejects', async () => {
            nock(nodeUrl)
                .post('/', payload)
                .reply(500);
            expect(
                batchRpcRequest(
                    fromAddress, 
                    contractAddress, 
                    functionDesc, 
                    paramsList,
                    providerMock,
                )
            ).to.be.rejected;
        });

        it('on connection error rejects', async () => {
            nock(nodeUrl)
                .post('/', payload)
                .replyWithError({code: 'ETIMEDOUT'});
            expect(
                batchRpcRequest(
                    fromAddress, 
                    contractAddress, 
                    functionDesc, 
                    paramsList,
                    providerMock,
                )
            ).to.be.rejected;
        });
    });
});
