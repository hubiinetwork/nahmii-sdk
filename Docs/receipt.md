<a name="module_striim-sdk"></a>

## striim-sdk

* [striim-sdk](#module_striim-sdk)
    * [Receipt](#exp_module_striim-sdk--Receipt) ⏏
        * _instance_
            * [.sign(privateKey)](#module_striim-sdk--Receipt+sign)
            * [.isSigned()](#module_striim-sdk--Receipt+isSigned) ⇒ <code>Boolean</code>
            * [.toJSON()](#module_striim-sdk--Receipt+toJSON) ⇒ <code>Object</code>
        * _static_
            * [.from(provider, payload)](#module_striim-sdk--Receipt.from) ⇒ <code>Receipt</code>

<a name="exp_module_striim-sdk--Receipt"></a>

### Receipt ⏏
Receipt
A class for modelling a _hubii striim_ payment receipt.

**Kind**: Exported class  
<a name="module_striim-sdk--Receipt+sign"></a>

#### receipt.sign(privateKey)
Will hash and sign the receipt given a private key

**Kind**: instance method of [<code>Receipt</code>](#exp_module_striim-sdk--Receipt)  

| Param | Type | Description |
| --- | --- | --- |
| privateKey | <code>String</code> \| <code>PrivateKey</code> | Operator private key |

<a name="module_striim-sdk--Receipt+isSigned"></a>

#### receipt.isSigned() ⇒ <code>Boolean</code>
Verifies that the receipt is signed by both sender and exchange, and has
not been tampered with since.

**Kind**: instance method of [<code>Receipt</code>](#exp_module_striim-sdk--Receipt)  
<a name="module_striim-sdk--Receipt+toJSON"></a>

#### receipt.toJSON() ⇒ <code>Object</code>
Converts the receipt into a JSON object

**Kind**: instance method of [<code>Receipt</code>](#exp_module_striim-sdk--Receipt)  
<a name="module_striim-sdk--Receipt.from"></a>

#### Receipt.from(provider, payload) ⇒ <code>Receipt</code>
Factory/de-serializing method

**Kind**: static method of [<code>Receipt</code>](#exp_module_striim-sdk--Receipt)  

| Param | Type | Description |
| --- | --- | --- |
| provider | <code>StriimProvider</code> | An instance of a StriimProvider |
| payload |  | A JSON object that can be de-serialized to a Rayment instance |

