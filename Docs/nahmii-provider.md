<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [NahmiiProvider](#exp_module_nahmii-sdk--NahmiiProvider) ⏏
        * [new NahmiiProvider(nahmiiBaseUrl, apiAppId, apiAppSecret)](#new_module_nahmii-sdk--NahmiiProvider_new)
        * [.getApiAccessToken()](#module_nahmii-sdk--NahmiiProvider+getApiAccessToken) ⇒ <code>Promise</code>
        * [.getSupportedTokens()](#module_nahmii-sdk--NahmiiProvider+getSupportedTokens) ⇒ <code>Promise</code>
        * [.getNahmiiBalances(address)](#module_nahmii-sdk--NahmiiProvider+getNahmiiBalances) ⇒ <code>Promise</code>
        * [.getPendingPayments()](#module_nahmii-sdk--NahmiiProvider+getPendingPayments) ⇒ <code>Promise</code>
        * [.registerPayment(payment)](#module_nahmii-sdk--NahmiiProvider+registerPayment) ⇒ <code>Promise</code>
        * [.getAllReceipts()](#module_nahmii-sdk--NahmiiProvider+getAllReceipts) ⇒ <code>Promise</code>

<a name="exp_module_nahmii-sdk--NahmiiProvider"></a>

### NahmiiProvider ⏏
NahmiiProvider
A class providing low-level access to the _hubii nahmii_ APIs.

**Kind**: Exported class  
<a name="new_module_nahmii-sdk--NahmiiProvider_new"></a>

#### new NahmiiProvider(nahmiiBaseUrl, apiAppId, apiAppSecret)
Construct a new NahmiiProvider.


| Param | Type | Description |
| --- | --- | --- |
| nahmiiBaseUrl | <code>string</code> | The base URL (domain name) for the nahmii API |
| apiAppId | <code>string</code> | nahmii API app-ID |
| apiAppSecret | <code>string</code> | nahmii API app-secret |

<a name="module_nahmii-sdk--NahmiiProvider+getApiAccessToken"></a>

#### nahmiiProvider.getApiAccessToken() ⇒ <code>Promise</code>
Resolves into the current token, or will obtain a new token from the
server as needed.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into an API access token  
<a name="module_nahmii-sdk--NahmiiProvider+getSupportedTokens"></a>

#### nahmiiProvider.getSupportedTokens() ⇒ <code>Promise</code>
Retrieves the list of tokens (currencies) supported by _hubii nahmii_.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into an array of token definitions.  
<a name="module_nahmii-sdk--NahmiiProvider+getNahmiiBalances"></a>

#### nahmiiProvider.getNahmiiBalances(address) ⇒ <code>Promise</code>
Retrieves the balances for all available tokens for the specified wallet address.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into a array of balance information.  

| Param | Type |
| --- | --- |
| address | <code>Address</code> | 

<a name="module_nahmii-sdk--NahmiiProvider+getPendingPayments"></a>

#### nahmiiProvider.getPendingPayments() ⇒ <code>Promise</code>
Retrieves all pending payments that have not yet been effectuated by the
server.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into an array of registered payments  
<a name="module_nahmii-sdk--NahmiiProvider+registerPayment"></a>

#### nahmiiProvider.registerPayment(payment) ⇒ <code>Promise</code>
Registers a payment with the server to have it effectuated. The payment
is expected to be hashed and signed according to the _hubii nahmii_
protocol.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into a registered payment payload  

| Param | Description |
| --- | --- |
| payment | A JSON object of a serialized signed Payment |

<a name="module_nahmii-sdk--NahmiiProvider+getAllReceipts"></a>

#### nahmiiProvider.getAllReceipts() ⇒ <code>Promise</code>
Retrieves all receipts for effectuated payments from the server.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into an array of payment receipts  
