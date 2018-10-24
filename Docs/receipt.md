<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [Receipt](#exp_module_nahmii-sdk--Receipt) ⏏
        * _instance_
            * [.sign()](#module_nahmii-sdk--Receipt+sign)
            * [.isSigned()](#module_nahmii-sdk--Receipt+isSigned) ⇒ <code>Boolean</code>
            * [.effectuate()](#module_nahmii-sdk--Receipt+effectuate) ⇒ <code>Promise</code>
            * [.toJSON()](#module_nahmii-sdk--Receipt+toJSON) ⇒ <code>Object</code>
        * _static_
            * [.from(wallet, json)](#module_nahmii-sdk--Receipt.from) ⇒ <code>Receipt</code>

<a name="exp_module_nahmii-sdk--Receipt"></a>

### Receipt ⏏
Receipt
A class for modelling a _hubii nahmii_ payment receipt.

**Kind**: Exported class  
<a name="module_nahmii-sdk--Receipt+sign"></a>

#### receipt.sign()
Will hash and sign the receipt with the wallet provided during instantiation

**Kind**: instance method of [<code>Receipt</code>](#exp_module_nahmii-sdk--Receipt)  

<a name="module_nahmii-sdk--Receipt+isSigned"></a>

#### receipt.isSigned() ⇒ <code>Boolean</code>
Verifies that the receipt is signed by both sender and exchange, and has
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

#### Receipt.from(wallet, json) ⇒ <code>Receipt</code>
Factory/de-serializing method

**Kind**: static method of [<code>Receipt</code>](#exp_module_nahmii-sdk--Receipt)  

| Param | Type | Description |
| --- | --- | --- |
| wallet | <code>Wallet</code> | An instance of a Wallet |
| json |  | A JSON object that can be de-serialized to a Receipt instance |

