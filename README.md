# HUBII STRIIM SDK

## About the SDK

This is a javascript library that wraps the _hubii striim_ APIs making them 
easier to get started with.

## About striim

_striim_ is _hubii_'s scaling solution for the Ethereum block chain. It is a
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

    npm install striim-sdk

## Usage

Create a provider to gain access to the low-level SDK:

```javascript

    const striim = require('striim-sdk');

    const provider = new striim.StriimProvider(striim_base_url, striim_app_id, striim_app_secret);

```

The provider can be used to gain access to the API resources, such as a 
wallet's balance:

```javascript

    const striim = require('striim-sdk');
    const provider = new striim.StriimProvider(striim_base_url, striim_app_id, striim_app_secret);

    // Logs all assets of the specified wallet to the console
    provider.getStriimBalances(wallet_address).then(console.log);

```

To do make more advanced workflows as easy as possible there is also a higher
level SDK, e.g.: the Wallet class and the Payment class. In this example we 
create a payment, sign it and register it with the API:

```javascript

    const striim = require('striim-sdk');
    const provider = new striim.StriimProvider(striim_base_url, striim_app_id, striim_app_secret);

    // Creates a new Payment, providing essential inputs such as the amount, 
    // the currency, the sender, and the recipient.
    const payment = new striim.Payment(provider, amount, erc20_token_address, wallet_address, recipient_address);

    // Signs the payment with the private key belonging to your wallet_address.
    payment.sign(private_key);

    // Sends the signed payment to the API for registration and execution and 
    // logs the API response to the console.
    payment.register().then(console.log);

```

## Reference manual

* [class StriimProvider](Docs/striim-provider.md)
* [class Wallet](Docs/wallet.md)
* [class Payment](Docs/payment.md)
