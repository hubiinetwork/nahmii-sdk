'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const stubbedIdentityModel = {
    createApiToken: sinon.stub()
};

function proxyquireProvider() {
    return proxyquire('./striim-provider', {
        './identity-model': stubbedIdentityModel
    });
}

const expectedJWT = 'some JWT';
const baseUrl = 'api base url';
const appId = 'striim api app id';
const appSecret = 'striim api app secret';
const node = 'some ethereum node url';
const network = 'testnet';

describe('Striim Provider', () => {
    afterEach(() => {
        stubbedIdentityModel.createApiToken.reset();
    });

    context('a StriimProvider with valid configuration', () => {
        let provider;

        beforeEach(() => {
            const StriimProvider = proxyquireProvider();
            provider = new StriimProvider(baseUrl, appId, appSecret, node, network);

            stubbedIdentityModel.createApiToken
                .withArgs(baseUrl, appId, appSecret)
                .resolves(expectedJWT);
        });

        it('can retrieve the API access token', async () => {
            expect(await provider.getApiAccessToken()).to.eql(expectedJWT);
        });

        it('will not recreate token after it has been created once', async () => {
            let t1 = await provider.getApiAccessToken();
            stubbedIdentityModel.createApiToken.resetBehavior();
            let t2 = await provider.getApiAccessToken();
            let t3 = await provider.getApiAccessToken();
            expect(t1).to.equal(t2);
            expect(t1).to.equal(t3);
            expect(stubbedIdentityModel.createApiToken.callCount).to.eql(1);
        });
    });
});
