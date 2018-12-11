<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [Payment](#exp_module_nahmii-sdk--Payment) ⏏
        * [new Payment(wallet, amount, sender, recipient)](#new_module_nahmii-sdk--Payment_new)
        * _instance_
            * [.amount](#module_nahmii-sdk--Payment+amount) ⇒ <code>MonetaryAmount</code>
            * [.sender](#module_nahmii-sdk--Payment+sender) ⇒ <code>Address</code>
            * [.recipient](#module_nahmii-sdk--Payment+recipient) ⇒ <code>Address</code>
            * [.sign()](#module_nahmii-sdk--Payment+sign)
            * [.isSigned()](#module_nahmii-sdk--Payment+isSigned) ⇒ <code>Boolean</code>
            * [.register()](#module_nahmii-sdk--Payment+register) ⇒ <code>Promise</code>
            * [.toJSON()](#module_nahmii-sdk--Payment+toJSON) ⇒
        * _static_
            * [.from(wallet, json)](#module_nahmii-sdk--Payment.from) ⇒ <code>Payment</code>

<a name="exp_module_nahmii-sdk--Payment"></a>

### Payment ⏏
Payment
A class for creating a _hubii nahmii_ payment.

**Kind**: Exported class  
<a name="new_module_nahmii-sdk--Payment_new"></a>

#### new Payment(wallet, amount, sender, recipient)
Constructor


| Param | Type | Description |
| --- | --- | --- |
| wallet | <code>Wallet</code> | A Wallet instance, must be the sender of this payment |
| amount | <code>MonetaryAmount</code> | Amount in a currency |
| sender | <code>Address</code> | Senders address |
| recipient | <code>Address</code> | Recipient address |

**Example**  
```js
const nahmii = require('nahmii-sdk');
const provider = new nahmii.NahmiiProvider(nahmii_base_url, nahmii_app_id, nahmii_app_secret);

// Creates a new Payment, providing essential inputs such as the amount,
// the currency, the sender, and the recipient.
const monetaryAmount = new nahmii.MonetaryAmount(amount, erc20_token_address);
const payment = new nahmii.Payment(provider, monetaryAmount, wallet_address, recipient_address);

// Signs the payment with the private key belonging to your wallet_address.
payment.sign(private_key);

// Sends the signed payment to the API for registration and execution and
// logs the API response to the console.
payment.register().then(console.log);
```
<a name="module_nahmii-sdk--Payment+amount"></a>

#### payment.amount ⇒ <code>MonetaryAmount</code>
This payment's amount and currency

**Kind**: instance property of [<code>Payment</code>](#exp_module_nahmii-sdk--Payment)  
<a name="module_nahmii-sdk--Payment+sender"></a>

#### payment.sender ⇒ <code>Address</code>
The sender of the payment

**Kind**: instance property of [<code>Payment</code>](#exp_module_nahmii-sdk--Payment)  
<a name="module_nahmii-sdk--Payment+recipient"></a>

#### payment.recipient ⇒ <code>Address</code>
The recipient of the payment

**Kind**: instance property of [<code>Payment</code>](#exp_module_nahmii-sdk--Payment)  
<a name="module_nahmii-sdk--Payment+sign"></a>

#### payment.sign()
Will hash and sign the payment with the wallet passed into the constructor

**Kind**: instance method of [<code>Payment</code>](#exp_module_nahmii-sdk--Payment)  
<a name="module_nahmii-sdk--Payment+isSigned"></a>

#### payment.isSigned() ⇒ <code>Boolean</code>
Verifies that the payment is signed by the sender and has not been
tampered with since.

**Kind**: instance method of [<code>Payment</code>](#exp_module_nahmii-sdk--Payment)  
<a name="module_nahmii-sdk--Payment+register"></a>

#### payment.register() ⇒ <code>Promise</code>
Registers the payment with the server to be effectuated

**Kind**: instance method of [<code>Payment</code>](#exp_module_nahmii-sdk--Payment)  
**Returns**: <code>Promise</code> - A promise that resolves to the registered payment as JSON  
<a name="module_nahmii-sdk--Payment+toJSON"></a>

#### payment.toJSON() ⇒
Converts the payment into a JSON object

**Kind**: instance method of [<code>Payment</code>](#exp_module_nahmii-sdk--Payment)  
**Returns**: A JSON object that is in the format the API expects  
<a name="module_nahmii-sdk--Payment.from"></a>

#### Payment.from(wallet, json) ⇒ <code>Payment</code>
Factory/de-serializing method

**Kind**: static method of [<code>Payment</code>](#exp_module_nahmii-sdk--Payment)  

| Param | Type | Description |
| --- | --- | --- |
| wallet | <code>Wallet</code> | The wallet sending the payment |
| json |  | A JSON object that can be de-serialized to a Payment instance |

