# NAHMII BY HUBII SDK

## About the SDK

This is a javascript library that wraps the _hubii nahmii_ APIs making them
easier to get started with.

## About nahmii

_nahmii_ is _hubii_'s scaling solution for the Ethereum block chain. It is a
hybrid centralized/decentralized solution that enables instant
(micro-) payments, trading and trustless settlements.

## About hubii

See www.hubii.com for more information.

## Prerequisites

* To use this software you need a modern version of **NodeJS and NPM**.
  We recommend having the current LTS version (v8.x) installed, or
  later, and updating NPM to the latest available version.
* You will also need an **API key** for access to _hubii_'s APIs.

## Installation

To install the SDK into your project, simply run:

    npm install nahmii-sdk

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
* [class Settlement](Docs/settlement.md)
* [class NullSettlement](Docs/null-settlement.md)
* [class DriipSettlement](Docs/driip-settlement.md)

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

* [Jacobo Toll-Messia](mailto:jacobo@hubii.com)
* [Morten Fjeldstad](mailto:morten@hubii.com)
