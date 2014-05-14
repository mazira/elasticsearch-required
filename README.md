# Introduction

Elasticsearch does not come with built-in support for specifying certain fields as required.
This plugin module adds this capability to the [Elasticsearch JavaScript client](https://github.com/elasticsearch/elasticsearch-js) by checking the data before it is indexed.

Note that "required" in this case does not mean "truthy", but rather that the field is specified. That is, `null` is still a valid value.

# Usage
## Installation
To install elasticsearch-required

    npm install elasticsearch
    npm install --production elasticsearch-required

## Usage
This plugin augments `client.indices.putMapping()` to allow for the specification of required fields. As such, it is required that you call `putMapping` on every instance of the Elasticsearch client before indexing so that the plugin can be initialized with what fields are required.

The following example demonstrates putting the mapping and indexing:
````javascript
var Client = require('elasticsearch').Client;
require('elasticsearch-required');

// create the client
var client = ...

// put the mapping with "required" property
client.putMapping({
	"index" : "test",
	"type" : "tweet",
	"body" : {
		"tweet" : {
			"properties" : {
				"message" : {
					"type" : "string",
					"required" : true
				}
			}
		}
	}
}).then(function () {
	// the following with result in "missing required field" error
	return client.index({
		"index" : "test",
		"type" : "tweet",
		"body" : {
		}
	});
});
````

# Testing
To run the unit tests

	npm test

# TODO
- Add support for bulk indexing
- Add support for `putMapping()` when multiple indices are specified

# License
MIT