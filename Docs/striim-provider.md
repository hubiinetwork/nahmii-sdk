<a name="module_striim-sdk"></a>

## striim-sdk

* [striim-sdk](#module_striim-sdk)
    * [StriimProvider](#exp_module_striim-sdk--StriimProvider) ⏏
        * [new StriimProvider(striimBaseUrl, apiAppId, apiAppSecret)](#new_module_striim-sdk--StriimProvider_new)
        * [.getApiAccessToken()](#module_striim-sdk--StriimProvider+getApiAccessToken) ⇒ <code>Promise</code>
        * [.getSupportedTokens()](#module_striim-sdk--StriimProvider+getSupportedTokens) ⇒ <code>Promise</code>
        * [.getStriimBalances(address)](#module_striim-sdk--StriimProvider+getStriimBalances) ⇒ <code>Promise</code>
        * [.getPendingPayments()](#module_striim-sdk--StriimProvider+getPendingPayments) ⇒ <code>Promise</code>
        * [.registerPayment(payment)](#module_striim-sdk--StriimProvider+registerPayment) ⇒ <code>Promise</code>
        * [.getAllReceipts()](#module_striim-sdk--StriimProvider+getAllReceipts) ⇒ <code>Promise</code>

<a name="exp_module_striim-sdk--StriimProvider"></a>

### StriimProvider ⏏
StriimProvider
A class providing low-level access to the _hubii striim_ APIs.

**Kind**: Exported class  
<a name="new_module_striim-sdk--StriimProvider_new"></a>

#### new StriimProvider(striimBaseUrl, apiAppId, apiAppSecret)
Construct a new StriimProvider.


| Param | Type | Description |
| --- | --- | --- |
| striimBaseUrl | <code>string</code> | The base URL (domain name) for the API |
| apiAppId | <code>string</code> | Hubii API app ID |
| apiAppSecret | <code>string</code> | Hubii API app secret |

<a name="module_striim-sdk--StriimProvider+getApiAccessToken"></a>

#### striimProvider.getApiAccessToken() ⇒ <code>Promise</code>
Resolves into the current token, or will obtain a new token from the
server as needed.

**Kind**: instance method of [<code>StriimProvider</code>](#exp_module_striim-sdk--StriimProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into an API access token  
<a name="module_striim-sdk--StriimProvider+getSupportedTokens"></a>

#### striimProvider.getSupportedTokens() ⇒ <code>Promise</code>
Retrieves the list of tokens (currencies) supported by _hubii striim_.

**Kind**: instance method of [<code>StriimProvider</code>](#exp_module_striim-sdk--StriimProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into an array of token definitions.  
<a name="module_striim-sdk--StriimProvider+getStriimBalances"></a>

#### striimProvider.getStriimBalances(address) ⇒ <code>Promise</code>
Retrieves the balances for all available tokens for the specified wallet address.

**Kind**: instance method of [<code>StriimProvider</code>](#exp_module_striim-sdk--StriimProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into a array of balance information.  

| Param | Type |
| --- | --- |
| address | <code>Address</code> | 

<a name="module_striim-sdk--StriimProvider+getPendingPayments"></a>

#### striimProvider.getPendingPayments() ⇒ <code>Promise</code>
Retrieves all pending payments that have not yet been effectuated by the
server.

**Kind**: instance method of [<code>StriimProvider</code>](#exp_module_striim-sdk--StriimProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into an array of registered payments  
<a name="module_striim-sdk--StriimProvider+registerPayment"></a>

#### striimProvider.registerPayment(payment) ⇒ <code>Promise</code>
Registers a payment with the server to have it effectuated. The payment
is expected to be hashed and signed according to the _hubii striim_
protocol.

**Kind**: instance method of [<code>StriimProvider</code>](#exp_module_striim-sdk--StriimProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into a registered payment payload  

| Param | Description |
| --- | --- |
| payment | A JSON object of a serialized signed Payment |

<a name="module_striim-sdk--StriimProvider+getAllReceipts"></a>

#### striimProvider.getAllReceipts() ⇒ <code>Promise</code>
Retrieves all receipts for effectuated payments from the server.

**Kind**: instance method of [<code>StriimProvider</code>](#exp_module_striim-sdk--StriimProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into an array of payment receipts  
