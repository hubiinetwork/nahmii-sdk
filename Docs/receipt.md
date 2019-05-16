<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [Receipt](#exp_module_nahmii-sdk--Receipt) ⏏
        * [new Receipt(payment, [walletOrProvider])](#new_module_nahmii-sdk--Receipt_new)
        * _instance_
            * [.payment](#module_nahmii-sdk--Receipt+payment) ⇒ <code>Payment</code>
            * [.blockNumber](#module_nahmii-sdk--Receipt+blockNumber) ⇒ <code>any</code>
            * [.sender](#module_nahmii-sdk--Receipt+sender) ⇒ <code>Address</code>
            * [.recipient](#module_nahmii-sdk--Receipt+recipient) ⇒ <code>Address</code>
            * [.operatorId](#module_nahmii-sdk--Receipt+operatorId) ⇒ <code>Number</code>
            * [.sign()](#module_nahmii-sdk--Receipt+sign)
            * [.isSigned()](#module_nahmii-sdk--Receipt+isSigned) ⇒ <code>Boolean</code>
            * [.effectuate()](#module_nahmii-sdk--Receipt+effectuate) ⇒ <code>Promise</code>
            * [.toJSON()](#module_nahmii-sdk--Receipt+toJSON) ⇒ <code>Object</code>
        * _static_
            * [.from(json, [walletOrProvider])](#module_nahmii-sdk--Receipt.from) ⇒ <code>Receipt</code>

<a name="exp_module_nahmii-sdk--Receipt"></a>

### Receipt ⏏
Receipt
A class for modelling a _hubii nahmii_ payment receipt.
To be able to sign a receipt, you must supply a valid Wallet instance.
To be able to do operations that interacts with the server you need to
supply a valid Wallet or NahmiiProvider instance.

**Kind**: Exported class  
<a name="new_module_nahmii-sdk--Receipt_new"></a>

#### new Receipt(payment, [walletOrProvider])
Receipt constructor


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| payment | <code>Payment</code> |  | A payment instance |
| [walletOrProvider] | <code>Wallet</code> \| <code>NahmiiProvider</code> | <code></code> | Optional wallet or provider instance |

<a name="module_nahmii-sdk--Receipt+payment"></a>

#### receipt.payment ⇒ <code>Payment</code>
Retrieve the payment this Receipt is based on.

**Kind**: instance property of [<code>Receipt</code>](#exp_module_nahmii-sdk--Receipt)  
<a name="module_nahmii-sdk--Receipt+blockNumber"></a>

#### receipt.blockNumber ⇒ <code>any</code>
Reference to the on-chain state the payments was effectuated after.

**Kind**: instance property of [<code>Receipt</code>](#exp_module_nahmii-sdk--Receipt)  
<a name="module_nahmii-sdk--Receipt+sender"></a>

#### receipt.sender ⇒ <code>Address</code>
The address of the sender

**Kind**: instance property of [<code>Receipt</code>](#exp_module_nahmii-sdk--Receipt)  
<a name="module_nahmii-sdk--Receipt+recipient"></a>

#### receipt.recipient ⇒ <code>Address</code>
The address of the recipient

**Kind**: instance property of [<code>Receipt</code>](#exp_module_nahmii-sdk--Receipt)  
<a name="module_nahmii-sdk--Receipt+operatorId"></a>

#### receipt.operatorId ⇒ <code>Number</code>
The ID of the operator that effectuated this payment.

**Kind**: instance property of [<code>Receipt</code>](#exp_module_nahmii-sdk--Receipt)  
<a name="module_nahmii-sdk--Receipt+sign"></a>

#### receipt.sign()
Will hash and sign the receipt with the wallet passed into the constructor

**Kind**: instance method of [<code>Receipt</code>](#exp_module_nahmii-sdk--Receipt)  
<a name="module_nahmii-sdk--Receipt+isSigned"></a>

#### receipt.isSigned() ⇒ <code>Boolean</code>
Verifies that the receipt is signed by both sender and operator, and has
not been tampered with since.

**Kind**: instance method of [<code>Receipt</code>](#exp_module_nahmii-sdk--Receipt)  
<a name="module_nahmii-sdk--Receipt+effectuate"></a>

#### receipt.effectuate() ⇒ <code>Promise</code>
Registers the receipt with the server to be effectuated

**Kind**: instance method of [<code>Receipt</code>](#exp_module_nahmii-sdk--Receipt)  
**Returns**: <code>Promise</code> - A promise that resolves to the registered receipt as JSON  
<a name="module_nahmii-sdk--Receipt+toJSON"></a>

#### receipt.toJSON() ⇒ <code>Object</code>
Converts the receipt into a JSON object

**Kind**: instance method of [<code>Receipt</code>](#exp_module_nahmii-sdk--Receipt)  
<a name="module_nahmii-sdk--Receipt.from"></a>

#### Receipt.from(json, [walletOrProvider]) ⇒ <code>Receipt</code>
Factory/de-serializing method

**Kind**: static method of [<code>Receipt</code>](#exp_module_nahmii-sdk--Receipt)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| json |  |  | A JSON object that can be de-serialized to a Receipt instance |
| [walletOrProvider] | <code>Wallet</code> \| <code>NahmiiProvider</code> | <code></code> | Optional wallet or provider instance |

