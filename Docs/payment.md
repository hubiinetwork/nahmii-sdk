<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [Payment](#exp_module_nahmii-sdk--Payment) ⏏
        * [new Payment(amount, sender, recipient, [walletOrProvider], [senderRef], [senderPayload])](#new_module_nahmii-sdk--Payment_new)
        * _instance_
            * [.amount](#module_nahmii-sdk--Payment+amount) ⇒ <code>MonetaryAmount</code>
            * [.sender](#module_nahmii-sdk--Payment+sender) ⇒ <code>Address</code>
            * [.recipient](#module_nahmii-sdk--Payment+recipient) ⇒ <code>Address</code>
            * [.senderPayload](#module_nahmii-sdk--Payment+senderPayload) ⇒ <code>string</code>
            * [.senderRef](#module_nahmii-sdk--Payment+senderRef) ⇒ <code>string</code>
            * [.sign()](#module_nahmii-sdk--Payment+sign)
            * [.isSigned()](#module_nahmii-sdk--Payment+isSigned) ⇒ <code>Boolean</code>
            * [.register()](#module_nahmii-sdk--Payment+register) ⇒ <code>Promise</code>
            * [.toJSON()](#module_nahmii-sdk--Payment+toJSON) ⇒
        * _static_
            * [.from(json, [walletOrProvider])](#module_nahmii-sdk--Payment.from) ⇒ <code>Payment</code>

<a name="exp_module_nahmii-sdk--Payment"></a>

### Payment ⏏
Payment
A class for creating a _hubii nahmii_ payment.
To be able to sign a new payment, you must supply a valid Wallet instance.
To be able to do operations that interacts with the server you need to
supply a valid Wallet or NahmiiProvider instance.

**Kind**: Exported class  
<a name="new_module_nahmii-sdk--Payment_new"></a>

#### new Payment(amount, sender, recipient, [walletOrProvider], [senderRef], [senderPayload])
Constructor
Creates a new payment with a unique sender reference.


| Param | Type | Description |
| --- | --- | --- |
| amount | <code>MonetaryAmount</code> | Amount in a currency |
| sender | <code>Address</code> | Senders address |
| recipient | <code>Address</code> | Recipient address |
| [walletOrProvider] | <code>Wallet</code> \| <code>NahmiiProvider</code> | An optional Wallet or NahmiiProvider instance |
| [senderRef] | <code>String</code> | Optional uuid identifying the payment. Must be unique per sender wallet. Random if undefined. |
| [senderPayload] | <code>String</code> | Optional stringified payment sender data payload |

**Example**  
```js
// Normal, random sender reference and no sender payload
const senderWallet = new nahmii.Wallet(...);
const recipientWallet = new nahmii.Wallet(...);
const paymentAmount = nahmii.MonetaryAmount.from(...);
const payment = new nahmii.Payment(paymentAmount, senderWallet.address, recipientWallet.address, senderWallet);

// Advanced, semantic sender reference (https://github.com/uuidjs/uuid) and no sender payload
const uuidNamespace = '706ac453-2691-41af-9fde-ac5f787da1ec';
const paymentSubject = '...';
const senderRef = uuidv5(paymentSubject, uuidNamespace);
const payment = new nahmii.Payment(paymentAmount, senderWallet.address, recipientWallet.address, senderWallet, senderRef);

// Advanced, random sender reference and stringified sender payload
const senderPayload = 'some sender payload';
const payment = new nahmii.Payment(paymentAmount, senderWallet.address, recipientWallet.address, senderWallet, null, senderPayload);
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
<a name="module_nahmii-sdk--Payment+senderPayload"></a>

#### payment.senderPayload ⇒ <code>string</code>
The sender's payload for the payment.

**Kind**: instance property of [<code>Payment</code>](#exp_module_nahmii-sdk--Payment)  
<a name="module_nahmii-sdk--Payment+senderRef"></a>

#### payment.senderRef ⇒ <code>string</code>
The sender's unique reference for the payment. A new unique reference is
generated automatically at construction time.

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

#### Payment.from(json, [walletOrProvider]) ⇒ <code>Payment</code>
Factory/de-serializing method

**Kind**: static method of [<code>Payment</code>](#exp_module_nahmii-sdk--Payment)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| json |  |  | A JSON object that can be de-serialized to a Payment instance |
| [walletOrProvider] | <code>Wallet</code> \| <code>NahmiiProvider</code> | <code></code> | The wallet used for signing the payment |

