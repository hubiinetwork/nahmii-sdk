<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [ClusterInformation](#exp_module_nahmii-sdk--ClusterInformation) ⏏
        * [.get(urlOrDomain)](#module_nahmii-sdk--ClusterInformation.get)

<a name="exp_module_nahmii-sdk--ClusterInformation"></a>

### ClusterInformation ⏏
ClusterInformation
Accessor to cluster information provided by the meta service.

**Kind**: Exported class  
<a name="module_nahmii-sdk--ClusterInformation.get"></a>

#### ClusterInformation.get(urlOrDomain)
Returns cluster information from the meta service.
Input is either a domain name or an URL.
Only http and https protocols are supported.
Defaults to https protocol if only domain is given.
External access through nahmii gateway requires https.
Will reject if URL is invalid or meta service cannot be reached.

**Kind**: static method of [<code>ClusterInformation</code>](#exp_module_nahmii-sdk--ClusterInformation)  

| Param | Type | Description |
| --- | --- | --- |
| urlOrDomain | <code>String</code> | Url or domain of the meta service. |

