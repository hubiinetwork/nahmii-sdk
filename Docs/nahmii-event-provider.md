<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [NahmiiEventProvider](#exp_module_nahmii-sdk--NahmiiEventProvider) ⏏
        * [new NahmiiEventProvider(nahmiiDomainOrProvider)](#new_module_nahmii-sdk--NahmiiEventProvider_new)
        * _instance_
            * [.onNewReceipt(listener)](#module_nahmii-sdk--NahmiiEventProvider+onNewReceipt) ⇒ <code>NahmiiEventProvider</code>
            * [.dispose()](#module_nahmii-sdk--NahmiiEventProvider+dispose)
        * _static_
            * [.from(nahmiiDomainOrProvider)](#module_nahmii-sdk--NahmiiEventProvider.from) ⇒ <code>Promise.&lt;NahmiiEventProvider&gt;</code>

<a name="exp_module_nahmii-sdk--NahmiiEventProvider"></a>

### NahmiiEventProvider ⏏
NahmiiEventProvider
A class emitting events whenever the API issues a push notification. It must
be given a provider during construction to be able to emit receipts that
can be verified.

**Kind**: Exported class  
<a name="new_module_nahmii-sdk--NahmiiEventProvider_new"></a>

#### new NahmiiEventProvider(nahmiiDomainOrProvider)
Construct a new NahmiiEventProvider.
Instead of using this constructor directly it is recommended that you use
the NahmiiEventProvider.from() factory function.


| Param | Type | Description |
| --- | --- | --- |
| nahmiiDomainOrProvider | <code>string</code> \| <code>NahmiiProvider</code> | The domain name for the nahmii API or an already configured NahmiiProvider |

**Example** *(Stand alone usage, no receipt verification)*  
```js
const {NahmiiEventProvider} = require('nahmii-sdk');

const nahmiiEvents = new NahmiiEventProvider('api.nahmii.io');
nahmiiEvents.onNewReceipt(receipt => {
    console.log('New receipt issued!');
    console.log(receipt.toJSON());
}
```
**Example** *(Monitoring and verifying receipts)*  
```js
const {NahmiiProvider, NahmiiEventProvider}= require('nahmii-sdk');

const provider = await NahmiiProvider.from('api.nahmii.io', my_app_id, my_app_secret);
const nahmiiEvents = await NahmiiEventProvider.from(provider);

nahmiiEvents.onNewReceipt(receipt => {
    if (!receipt.isSigned())
        throw Error('Invalid receipt received!');
    console.log('New receipt issued!');
    console.log(receipt.toJSON());
});
```
<a name="module_nahmii-sdk--NahmiiEventProvider+onNewReceipt"></a>

#### nahmiiEventProvider.onNewReceipt(listener) ⇒ <code>NahmiiEventProvider</code>
Registers listener function so it will be called whenever a new Receipt
has been issued by the nahmii cluster.
Multiple calls passing the same listener function will result in the
listener being added, and called, multiple times.
Returns a reference to the NahmiiEventProvider, so that calls can be
chained.

**Kind**: instance method of [<code>NahmiiEventProvider</code>](#exp_module_nahmii-sdk--NahmiiEventProvider)  

| Param |
| --- |
| listener | 

<a name="module_nahmii-sdk--NahmiiEventProvider+dispose"></a>

#### nahmiiEventProvider.dispose()
Call this to stop listening for events from the nahmii cluster. The
instance of the NahmiiEventProvider can not be used after it has been
disposed.

**Kind**: instance method of [<code>NahmiiEventProvider</code>](#exp_module_nahmii-sdk--NahmiiEventProvider)  
<a name="module_nahmii-sdk--NahmiiEventProvider.from"></a>

#### NahmiiEventProvider.from(nahmiiDomainOrProvider) ⇒ <code>Promise.&lt;NahmiiEventProvider&gt;</code>
Creates a new NahmiiEventProvider based on the input provided.

**Kind**: static method of [<code>NahmiiEventProvider</code>](#exp_module_nahmii-sdk--NahmiiEventProvider)  

| Param | Type | Description |
| --- | --- | --- |
| nahmiiDomainOrProvider | <code>string</code> \| <code>NahmiiProvider</code> | The nahmii domain to connect to or an already connected provider. |

