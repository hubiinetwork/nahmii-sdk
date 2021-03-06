# NAHMII SDK

## About the SDK

This is a javascript library that wraps the _nahmii_ APIs making them
easier to get started with.

## About nahmii

_nahmii_ is both the name of the company as well as of the scaling solution 
for the Ethereum blockchain. It is a hybrid centralized/decentralized 
solution that enables instant (micro-)payments, trading and trustless 
settlements. See www.nahmii.io for additional information.

## About hubii

_hubii_ is no more. It is the old name of the company. If you find references 
to it, think _nahmii_. Still this repository is hosted in the GitHub organization
archaically labelled _hubiinetwork_.

## Prerequisites

* To use this software you need a modern version of **NodeJS and NPM**.
  We recommend having the versions 10 installed and updating NPM to the
  latest available version.
* You will also need an **API key** for access to the _nahmii_ APIs.

## Installation

To install the SDK into your project, simply run:

    npm install nahmii-sdk

## Dependency management

After you have installed the nahmii-sdk module into your own project, please 
make sure to install the dependencies listed as _peer dependencies_ into your 
project to have it included in the end product.

The reason this SDK uses _peer dependencies_ is that it is actively doing type 
checking for some shared types in some situations. To have type checking work in 
a nodejs environment, all npm-based types must be de-duplicated. 

To force a de-duplication after you have installed several modules, just run the 
following command:

    npm ddp

In most cases this should not be needed though.

## Usage

Create a provider to gain access to the low-level SDK:

```javascript

    const nahmii = require('nahmii-sdk');

    const provider = await nahmii.NahmiiProvider.from(nahmii_domain, nahmii_app_id, nahmii_app_secret);

```

The provider can be used to gain access to the API resources, such as a
wallet's balance:

```javascript

    const nahmii = require('nahmii-sdk');
    const provider = await nahmii.NahmiiProvider.from(nahmii_domain, nahmii_app_id, nahmii_app_secret);

    // Logs all assets of the specified wallet to the console
    const balances = await provider.getNahmiiBalances(wallet_address);
    console.log(balances);

```

To make a more advanced workflow as easy as possible there is also a higher
level SDK, e.g.: the Wallet class and the Payment class. In this example we
create a payment, sign it and register it with the API:

```javascript

    const nahmii = require('nahmii-sdk');
    const provider = await nahmii.NahmiiProvider.from(nahmii_domain, nahmii_app_id, nahmii_app_secret);
    const wallet = new nahmii.Wallet(private_key, provider);

    // Creates a new Payment, providing essential inputs such as the amount,
    // the currency, the sender, and the recipient.
    const monetaryAmount = nahmii.MonetaryAmount.from(amount, erc20_token_address);
    const payment = new nahmii.Payment(wallet, monetaryAmount, wallet_address, recipient_address);

    // Signs the payment with the wallet passed during instantiation
    payment.sign();

    // Sends the signed payment to the API for registration and execution and
    // logs the API response to the console.
    payment.register().then(console.log);

```

## Reference manual

**Fundamentals**
* [class NahmiiProvider](Docs/nahmii-provider.md)
* [class NahmiiEventProvider](Docs/nahmii-event-provider.md)
* [class Wallet](Docs/wallet.md)

**Workflow: Payments**
* [class Payment](Docs/payment.md)
* [class Receipt](Docs/receipt.md)

**Workflow: Settlement**
* [class SettlementFactory](Docs/settlement-factory.md)
* [class OnchainBalanceSettlement](Docs/onchain-balance-settlement.md)
* [class PaymentSettlement](Docs/payment-settlement.md)

**Base Layer**
* [class Erc20Contract](Docs/erc20-contract.md)
* [class NahmiiContract](Docs/nahmii-contract.md)

**Utilities**
* [class MonetaryAmount](Docs/monetary-amount.md)
* [class utils](Docs/utils.md)

## Contributing

To contribute to the development of the nahmii SDK, you need to clone the
repository `https://github.com/hubiinetwork/nahmii-sdk.git`.

You changes should be made on a branch starting with the name "feature/" 
(e.g.: `feature/awesomesauce`) and be branched from the latest "master"
branch.

We also follow a few practices that we expect contributors to also adhere 
to.

### Practices

**Branching Model**

The master branch is expected to always be in a _green_ state. Every 
commit to master is expected generate a new NPM release of the library.
For more long lasting work, create a feature branch and merge it through
a pull request.

**Pull Request**

Don't just push a new branch and expect us to magically discover it and 
do something with it; also make sure you create a pull request for your 
branch where the changes can be examined and findings recorded in a 
organized manner.

If your changes address either partially, or fully, an open issue in the
backlog, make sure to reference it in the description of your pull 
requests.

Also make sure to reference one or more of the admins of the repo and 
set them as reviewers for your pull request.

**Code Review**

As part of the pull requests all reviewers should as soon as possible 
provide constructive feedback on the pull request.

The reviewer should look at the following as a minimum:

- Code quality, readability, maintainability, performance, security
- Test code quality, coverage, readability, maintainability
- Design of any public APIs, including documentation
- Overall architecture of solution, does it fit with current designs
- Missed opportunities: simplification of design, refactoring, 
  invalidation of previous assumptions

**Test Driven Development (TDD)**

Why? Because done right, the codebase becomes better and getting full 
test coverage becomes trivial. Always start by writing a test that turns 
*red*, then change your production code to turn it (and all other tests) 
*green* again. Then do some refactoring as needed. Refactoring is 
arguably the most important step, so dont skip it. Rinse and repeat. 
Follow the cycle "red-green-refactor" and don't leave any of the steps 
out. And yes, an experienced TDD practitioner can in most cases easily 
spot code that has not been created using TDD.

There is no need to limit you test suite to only have unit tests, but 
the unit tests themselves should have ~100% code coverage.

## Who do I talk to?

* [nahmii support](mailto:support@nahmii.io)
