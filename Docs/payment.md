<a name="module_striim-sdk"></a>

## striim-sdk

* [striim-sdk](#module_striim-sdk)
    * [Payment](#exp_module_striim-sdk--Payment) ⏏
        * [new Payment(provider, amount, currency, sender, recipient)](#new_module_striim-sdk--Payment_new)
        * _instance_
            * [.amount](#module_striim-sdk--Payment+amount) ⇒ <code>String</code> \| <code>BigNumber</code>
            * [.currency](#module_striim-sdk--Payment+currency) ⇒ <code>Address</code>
            * [.sender](#module_striim-sdk--Payment+sender) ⇒ <code>Address</code>
            * [.recipient](#module_striim-sdk--Payment+recipient) ⇒ <code>Address</code>
            * [.sign(privateKey)](#module_striim-sdk--Payment+sign)
            * [.isSigned()](#module_striim-sdk--Payment+isSigned) ⇒ <code>Boolean</code>
            * [.register()](#module_striim-sdk--Payment+register) ⇒ <code>Promise</code>
            * [.toJSON()](#module_striim-sdk--Payment+toJSON) ⇒ <code>Object</code>
        * _static_
            * [.from(provider, json)](#module_striim-sdk--Payment.from) ⇒ <code>Payment</code>

<a name="exp_module_striim-sdk--Payment"></a>

### Payment ⏏
Payment
A class for creating a _hubii striim_ payment.

**Kind**: Exported class  
<a name="new_module_striim-sdk--Payment_new"></a>

#### new Payment(provider, amount, currency, sender, recipient)
Constructor


| Param | Type | Description |
| --- | --- | --- |
| provider | <code>StriimProvider</code> | A StriimProvider instance |
| amount | <code>String</code> \| <code>BigNumber</code> | Amount in base units (wei for ETH) |
| currency | <code>Address</code> | Currency identifier for the payment, 0x0000000000000000000000000000000000000000 for ETH |
| sender | <code>Address</code> | Senders address |
| recipient | <code>Address</code> | Recipient address |

**Example**  
```js
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
<a name="module_striim-sdk--Payment+amount"></a>

#### payment.amount ⇒ <code>String</code> \| <code>BigNumber</code>
The amount of currency in base units (wei for ETH)

**Kind**: instance property of [<code>Payment</code>](#exp_module_striim-sdk--Payment)  
<a name="module_striim-sdk--Payment+currency"></a>

#### payment.currency ⇒ <code>Address</code>
The currency identifier of the payment, 0x0000000000000000000000000000000000000000 for ETH

**Kind**: instance property of [<code>Payment</code>](#exp_module_striim-sdk--Payment)  
<a name="module_striim-sdk--Payment+sender"></a>

#### payment.sender ⇒ <code>Address</code>
The sender of the payment

**Kind**: instance property of [<code>Payment</code>](#exp_module_striim-sdk--Payment)  
<a name="module_striim-sdk--Payment+recipient"></a>

#### payment.recipient ⇒ <code>Address</code>
The recipient of the payment

**Kind**: instance property of [<code>Payment</code>](#exp_module_striim-sdk--Payment)  
<a name="module_striim-sdk--Payment+sign"></a>

#### payment.sign(privateKey)
Will hash and sign the payment given a private key

**Kind**: instance method of [<code>Payment</code>](#exp_module_striim-sdk--Payment)  

| Param | Type | Description |
| --- | --- | --- |
| privateKey | <code>String</code> \| <code>PrivateKey</code> | This key should match the sender address |

<a name="module_striim-sdk--Payment+isSigned"></a>

#### payment.isSigned() ⇒ <code>Boolean</code>
Verifies that the payment is signed by the sender and has not been
tampered with since.

**Kind**: instance method of [<code>Payment</code>](#exp_module_striim-sdk--Payment)  
<a name="module_striim-sdk--Payment+register"></a>

#### payment.register() ⇒ <code>Promise</code>
Registers the payment with the server to be effectuated

**Kind**: instance method of [<code>Payment</code>](#exp_module_striim-sdk--Payment)  
**Returns**: <code>Promise</code> - A promise that resolves to the registered payment as JSON  
<a name="module_striim-sdk--Payment+toJSON"></a>

#### payment.toJSON() ⇒ <code>Object</code>
Converts the payment into a JSON object

**Kind**: instance method of [<code>Payment</code>](#exp_module_striim-sdk--Payment)  
<a name="module_striim-sdk--Payment.from"></a>

#### Payment.from(provider, json) ⇒ <code>Payment</code>
Factory/de-serializing method

**Kind**: static method of [<code>Payment</code>](#exp_module_striim-sdk--Payment)  

| Param | Type | Description |
| --- | --- | --- |
| provider | <code>StriimProvider</code> | An instance of a StriimProvider |
| json |  | A JSON object that can be de-serialized to a Payment instance |

