<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [NahmiiProvider](#exp_module_nahmii-sdk--NahmiiProvider) ⏏
        * [new NahmiiProvider(nahmiiDomain, apiAppId, apiAppSecret, nodeUrl, network, [operator])](#new_module_nahmii-sdk--NahmiiProvider_new)
        * _instance_
            * [.operatorAddress](#module_nahmii-sdk--NahmiiProvider+operatorAddress) ⇒ <code>EthereumAddress</code> \| <code>null</code>
            * [.nahmiiDomain](#module_nahmii-sdk--NahmiiProvider+nahmiiDomain) ⇒ <code>string</code>
            * [.isUpdating](#module_nahmii-sdk--NahmiiProvider+isUpdating) ⇒ <code>boolean</code>
            * [.startUpdate()](#module_nahmii-sdk--NahmiiProvider+startUpdate)
            * [.stopUpdate()](#module_nahmii-sdk--NahmiiProvider+stopUpdate)
            * [.getApiAccessToken()](#module_nahmii-sdk--NahmiiProvider+getApiAccessToken) ⇒ <code>Promise</code>
            * [.getSupportedTokens()](#module_nahmii-sdk--NahmiiProvider+getSupportedTokens) ⇒ <code>Promise</code>
            * [.getTokenInfo(symbolOrAddress, byAddress)](#module_nahmii-sdk--NahmiiProvider+getTokenInfo) ⇒ <code>Promise.&lt;Object&gt;</code>
            * [.getNahmiiBalances(address)](#module_nahmii-sdk--NahmiiProvider+getNahmiiBalances) ⇒ <code>Promise</code>
            * [.getPendingPayments()](#module_nahmii-sdk--NahmiiProvider+getPendingPayments) ⇒ <code>Promise</code>
            * [.registerPayment(payment)](#module_nahmii-sdk--NahmiiProvider+registerPayment) ⇒ <code>Promise</code>
            * [.effectuatePayment(receipt)](#module_nahmii-sdk--NahmiiProvider+effectuatePayment) ⇒ <code>Promise</code>
            * [.registerSettlement(serializedTransaction)](#module_nahmii-sdk--NahmiiProvider+registerSettlement) ⇒ <code>Promise</code>
            * [.getAllReceipts()](#module_nahmii-sdk--NahmiiProvider+getAllReceipts) ⇒ <code>Promise</code>
            * [.getWalletReceipts(address, [fromNonce], [limit], [asc])](#module_nahmii-sdk--NahmiiProvider+getWalletReceipts) ⇒ <code>Promise</code>
            * [.getTransactionConfirmation(transactionHash, [timeout])](#module_nahmii-sdk--NahmiiProvider+getTransactionConfirmation) ⇒ <code>Promise.&lt;Object&gt;</code>
            * [.getClusterInformation()](#module_nahmii-sdk--NahmiiProvider+getClusterInformation) ⇒ <code>Promise.&lt;\*&gt;</code>
        * _static_
            * [.from(nahmiiDomain, apiAppId, apiAppSecret)](#module_nahmii-sdk--NahmiiProvider.from) ⇒ <code>Promise.&lt;NahmiiProvider&gt;</code>

<a name="exp_module_nahmii-sdk--NahmiiProvider"></a>

### NahmiiProvider ⏏
NahmiiProvider
A class providing low-level access to the _nahmii_ APIs.

**Kind**: Exported class  
<a name="new_module_nahmii-sdk--NahmiiProvider_new"></a>

#### new NahmiiProvider(nahmiiDomain, apiAppId, apiAppSecret, nodeUrl, network, [operator])
Construct a new NahmiiProvider.
Instead of using this constructor directly it is recommended that you use
the NahmiiProvider.from() factory function.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| nahmiiDomain | <code>string</code> |  | The domain name for the nahmii API |
| apiAppId | <code>string</code> |  | nahmii API app-ID |
| apiAppSecret | <code>string</code> |  | nahmii API app-secret |
| nodeUrl | <code>string</code> |  | url to an ethereum node to connect to |
| network | <code>string</code> \| <code>number</code> |  | a known ethereum network name or ID |
| [operator] | <code>EthereumAddress</code> | <code></code> | The address of the nahmii operator |

**Example**  
```js
const {NahmiiProvider} = require('nahmii-sdk');

const provider = await NahmiiProvider.from('api.nahmii.io', app_id, app_secret);
```
<a name="module_nahmii-sdk--NahmiiProvider+operatorAddress"></a>

#### nahmiiProvider.operatorAddress ⇒ <code>EthereumAddress</code> \| <code>null</code>
Returns the operator address of the nahmii cluster as it was defined at
the time when this provider was created.

**Kind**: instance property of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
<a name="module_nahmii-sdk--NahmiiProvider+nahmiiDomain"></a>

#### nahmiiProvider.nahmiiDomain ⇒ <code>string</code>
Retrieves the domain name of the nahmii cluster.

**Kind**: instance property of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
<a name="module_nahmii-sdk--NahmiiProvider+isUpdating"></a>

#### nahmiiProvider.isUpdating ⇒ <code>boolean</code>
Returns the state of the API access token update process.

**Kind**: instance property of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>boolean</code> - True if the update is running, false otherwise.  
<a name="module_nahmii-sdk--NahmiiProvider+startUpdate"></a>

#### nahmiiProvider.startUpdate()
Force provider to start updating the API access token once a minute. The
update will continue until stopUpdate() is called.
Using any methods that require an API access token will automatically
start the update process.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
<a name="module_nahmii-sdk--NahmiiProvider+stopUpdate"></a>

#### nahmiiProvider.stopUpdate()
Stops the automatic update of API access tokens. This should be called
when you want to terminate/delete the provider to ensure there are no
lingering references.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
<a name="module_nahmii-sdk--NahmiiProvider+getApiAccessToken"></a>

#### nahmiiProvider.getApiAccessToken() ⇒ <code>Promise</code>
Resolves into the current token, or will obtain a new token from the
server as needed.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into an API access token  
<a name="module_nahmii-sdk--NahmiiProvider+getSupportedTokens"></a>

#### nahmiiProvider.getSupportedTokens() ⇒ <code>Promise</code>
Retrieves the list of tokens (currencies) supported by _nahmii_.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into an array of token definitions.  
<a name="module_nahmii-sdk--NahmiiProvider+getTokenInfo"></a>

#### nahmiiProvider.getTokenInfo(symbolOrAddress, byAddress) ⇒ <code>Promise.&lt;Object&gt;</code>
Retrieves information about the token that has the specified symbol.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| symbolOrAddress | <code>string</code> |  | token symbol or address |
| byAddress | <code>boolean</code> | <code>false</code> | a flag to tell whether to look up by symbol or address |

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
is expected to be hashed and signed according to the _nahmii_
protocol.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into a registered payment payload  

| Param | Description |
| --- | --- |
| payment | A JSON object of a serialized signed Payment |

<a name="module_nahmii-sdk--NahmiiProvider+effectuatePayment"></a>

#### nahmiiProvider.effectuatePayment(receipt) ⇒ <code>Promise</code>
Registers a receipt with the server to effectuate the transfer. The
receipt is expected to be hashed and signed according to the
_nahmii_ protocol.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolved into a receipt registration payload  

| Param | Description |
| --- | --- |
| receipt | A JSON object of a serialized signed Receipt |

<a name="module_nahmii-sdk--NahmiiProvider+registerSettlement"></a>

#### nahmiiProvider.registerSettlement(serializedTransaction) ⇒ <code>Promise</code>
Registers a settlement with the server. The settlement is expected to notify the server,
which will relay it to a node provider if it is a valid settlement proposal.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into a registered settlement payload  

| Param | Description |
| --- | --- |
| serializedTransaction | A JSON object of a serialized signed Payment |

<a name="module_nahmii-sdk--NahmiiProvider+getAllReceipts"></a>

#### nahmiiProvider.getAllReceipts() ⇒ <code>Promise</code>
Retrieves all receipts for effectuated payments from the server.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into an array of payment receipts  
<a name="module_nahmii-sdk--NahmiiProvider+getWalletReceipts"></a>

#### nahmiiProvider.getWalletReceipts(address, [fromNonce], [limit], [asc]) ⇒ <code>Promise</code>
Retrieves all receipts for effectuated payments using filter/pagination
criteria.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise</code> - A promise that resolves into an array of payment receipts  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| address | <code>Address</code> |  | Filter payment receipts for a specific wallet address. |
| [fromNonce] | <code>number</code> |  | Filter payment receipts greater or equal to specific nonce. |
| [limit] | <code>number</code> |  | The max number of payment receipts to return. |
| [asc] | <code>boolean</code> | <code>false</code> | Return payment receipts in asc order. |

<a name="module_nahmii-sdk--NahmiiProvider+getTransactionConfirmation"></a>

#### nahmiiProvider.getTransactionConfirmation(transactionHash, [timeout]) ⇒ <code>Promise.&lt;Object&gt;</code>
Waits for a transaction to be mined, polling every second.
Rejects if a transaction is mined, but fails to execute, for example in an out of gas scenario.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**See**: https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-receipts  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| transactionHash | <code>string</code> |  |  |
| [timeout] | <code>number</code> | <code>60</code> | Seconds to wait before timing out |

**Example**  
```js
const {hash} = await wallet.depositEth('1.1', {gasLimit: 200000});
const transactionReceipt = await getTransactionConfirmation(hash);
```
<a name="module_nahmii-sdk--NahmiiProvider+getClusterInformation"></a>

#### nahmiiProvider.getClusterInformation() ⇒ <code>Promise.&lt;\*&gt;</code>
Retrieves the cluster information from the connected cluster.

**Kind**: instance method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  
**Returns**: <code>Promise.&lt;\*&gt;</code> - A promise that resolves into a cluster information structure  
<a name="module_nahmii-sdk--NahmiiProvider.from"></a>

#### NahmiiProvider.from(nahmiiDomain, apiAppId, apiAppSecret) ⇒ <code>Promise.&lt;NahmiiProvider&gt;</code>
Factory method for creating a new NahmiiProvider automatically configured
from the specified nahmii cluster.

**Kind**: static method of [<code>NahmiiProvider</code>](#exp_module_nahmii-sdk--NahmiiProvider)  

| Param | Type | Description |
| --- | --- | --- |
| nahmiiDomain | <code>string</code> | The domain name for the nahmii API |
| apiAppId | <code>string</code> | nahmii API app-ID |
| apiAppSecret | <code>string</code> | nahmii API app-secret |

