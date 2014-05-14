// npm
var ESClient = require('elasticsearch').Client;
var Promise = require('bluebird');

// file vars
var apis = ['master', '1.x', '1.1', '1.0', '0.90'];

apis.forEach(function (api) {
	api = ESClient.apis[api];

	var putMappingOriginal = api.indices.prototype.putMapping;
	var indexOriginal = api.index;

	/**
	 * Overrides client.indices.putMapping
	 * @param params
	 * @param cb
	 * @returns {*}
	 */
	api.indices.prototype.putMapping = function (params, cb) {
		var mapping = params.body[params.type];

		// get the required fields from the mapping
		var requiredFields = getRequiredFields(mapping);

		// store the required fields in the client object, keyed by index and type
		this._requiredFields = this._requiredFields || {};
		this._requiredFields[params.index + params.type] = requiredFields;

		// call the original putMapping()
		return putMappingOriginal.call(this, params, cb);
	};

	/**
	 * Overrides client.index
	 * @param params
	 * @param cb
	 * @returns {*}
	 */
	api.index = function (params, cb) {
		// get the stored required fields
		var requiredFields = this.indices._requiredFields;
		requiredFields = requiredFields && requiredFields[params.index + params.type];

		if ( !requiredFields )
			return indexOriginal.call(this, params, cb);

		// go through the required fields, checking that each is present
		var missing = [];
		requiredFields.forEach(function (field) {
			// the required field may not be a root field
			var path = field.split('.');

			// drill down the document and get the actual property value
			var value = params.body;
			path.forEach(function (pathPart) {
				value = value && value[pathPart];
			});

			if ( value === undefined )
				missing.push(field);
		});

		if ( missing.length ) {
			var error = new Error('Missing required field' + (missing.length > 1 ? 's' : '') + ' "' + missing.join('", "') + '"');
			cb && cb(error);
			return Promise.reject(error);
		}

		return indexOriginal.call(this, params, cb);
	};

	var getRequiredFields = function (mapping) {
		return _getRequiredFieldsRecursive([], mapping);
	};

	var _getRequiredFieldsRecursive = function (parents, mapping) {
		var requiredFields = [];

		// if this property has no child properties, return
		if ( !mapping.properties )
			return requiredFields;

		var props = Object.keys(mapping.properties);

		// iterate through all properties, looking for ones marked "required"
		props.forEach(function (prop) {
			var _mapping = mapping.properties[prop];
			var _parents = parents.concat([prop]);
			if ( _mapping.required )
				requiredFields.push(_parents.join('.'));

			// recurse through child properties
			requiredFields = requiredFields.concat(_getRequiredFieldsRecursive(_parents, _mapping));
		});

		return requiredFields;
	};
});