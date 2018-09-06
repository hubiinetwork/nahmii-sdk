## Modules

<dl>
<dt><a href="#module_striim-sdk/utils">striim-sdk/utils</a></dt>
<dd></dd>
</dl>

## Functions

<dl>
<dt><a href="#hash">hash(...args)</a> ⇒ <code>String</code></dt>
<dd><p>Hash according to <a href="https://en.wikipedia.org/wiki/SHA-3">sha3 (aka keccak-256)</a></p>
</dd>
<dt><a href="#hashObject">hashObject(obj, propertyNameGlobs)</a> ⇒ <code>String</code></dt>
<dd><p>Plucks properties from an object, and hashes them according to <a href="https://en.wikipedia.org/wiki/SHA-3">sha3 (aka keccak-256)</a></p>
</dd>
<dt><a href="#prefix0x">prefix0x(str)</a> ⇒ <code>String</code></dt>
<dd><p>Make sure the string provided has a 0x prefix</p>
</dd>
<dt><a href="#strip0x">strip0x(str)</a> ⇒ <code>String</code></dt>
<dd><p>Removes 0x from the start of the string if present.</p>
</dd>
<dt><a href="#ethHash">ethHash(message)</a> ⇒ <code>String</code></dt>
<dd><p>Re-hashes a message as an Ethereum message hash.</p>
</dd>
<dt><a href="#sign">sign(message, privateKey)</a> ⇒ <code>Object</code></dt>
<dd><p>Creates a signature for the specified message the Ethereum way according to
<a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sign">eth_sign</a></p>
</dd>
<dt><a href="#isSignedBy">isSignedBy(message, signature, address)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Checks whether or not the address is the address of the private key used to
sign the specified message and signature.</p>
</dd>
</dl>

<a name="module_striim-sdk/utils"></a>

## striim-sdk/utils
<a name="hash"></a>

## hash(...args) ⇒ <code>String</code>
Hash according to [sha3 (aka keccak-256)](https://en.wikipedia.org/wiki/SHA-3)

**Kind**: global function  
**Returns**: <code>String</code> - 32 byte hash value as hex  

| Param |
| --- |
| ...args | 

<a name="hashObject"></a>

## hashObject(obj, propertyNameGlobs) ⇒ <code>String</code>
Plucks properties from an object, and hashes them according to [sha3 (aka keccak-256)](https://en.wikipedia.org/wiki/SHA-3)

**Kind**: global function  
**Returns**: <code>String</code> - 32 byte hash value as hex  

| Param | Type |
| --- | --- |
| obj | <code>Object</code> | 
| propertyNameGlobs | <code>Array.&lt;String&gt;</code> | 

<a name="prefix0x"></a>

## prefix0x(str) ⇒ <code>String</code>
Make sure the string provided has a 0x prefix

**Kind**: global function  
**Returns**: <code>String</code> - Input prefixed with 0x if not already present.  

| Param |
| --- |
| str | 

<a name="strip0x"></a>

## strip0x(str) ⇒ <code>String</code>
Removes 0x from the start of the string if present.

**Kind**: global function  
**Returns**: <code>String</code> - Input without any 0x prefix.  

| Param |
| --- |
| str | 

<a name="ethHash"></a>

## ethHash(message) ⇒ <code>String</code>
Re-hashes a message as an Ethereum message hash.

**Kind**: global function  
**Returns**: <code>String</code> - hexadecimal string  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>String</code> | hexadecimal string |

<a name="sign"></a>

## sign(message, privateKey) ⇒ <code>Object</code>
Creates a signature for the specified message the Ethereum way according to
[eth_sign](https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sign)

**Kind**: global function  
**Returns**: <code>Object</code> - Signature as an object literal with r, s and v properties.  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>String</code> | hexadecimal string |
| privateKey | <code>String</code> | hexadecimal string |

<a name="isSignedBy"></a>

## isSignedBy(message, signature, address) ⇒ <code>Boolean</code>
Checks whether or not the address is the address of the private key used to
sign the specified message and signature.

**Kind**: global function  
**Returns**: <code>Boolean</code> - True if address belongs to the signed message  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>String</code> | A message hash as a hexadecimal string |
| signature | <code>Object</code> | The signature of the message given as V, R and S properties |
| address | <code>String</code> | A hexadecimal representation of the address to verify |

