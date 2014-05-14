// npm
var ESClient = require('elasticsearch').Client;
var chai = require('chai');

// module
var utilities = require('./utilities.js');

// file
var testIndex = 'test';
var testType = 'tweet';
var should = chai.should();

chai.use(require('chai-as-promised'));

// load elasticsearch-required plugin
require('../');

describe('elasticsearch-required', function () {
	var client;

	var mapping = {};
	mapping[testType] = {
		"properties" : {
			"message1" : { "type" : "string", "store" : true },
			"message2" : { "type" : "string", "store" : true, "required" : true },
			"obj" : {
				"properties" : {
					"message1" : { "type" : "string", "store" : true },
					"message2" : { "type" : "string", "store" : true, "required" : true }
				}
			}
		}
	};

	before(function () {
		var elasticOptions = {
			host : 'localhost:9200',
			apiVersion : '1.0'
		};
		client = new ESClient(elasticOptions);
		return client.indices.create({
			index : testIndex
		});
	});

	after(function () {
		// file vars
		return client.indices.delete({
			index : testIndex
		}).finally(function () {
			client.close();
		});
	});

	describe('indices.putMapping()', function () {
		afterEach(function () {
			return client.indices.deleteMapping({
				index : testIndex,
				type : testType
			})
		});
		it('should properly send the mapping to Elasticsearch', function () {
			return client.indices.putMapping({
				index : testIndex,
				type : testType,
				body : mapping
			})
				.then(function () {
					return client.indices.getMapping({
						index : testIndex,
						type : testType
					});
				})
				.then(function (mapping) {
					mapping.should.have.property(testIndex);
					mapping[testIndex].mappings.should.have.property(testType);
				});
		});
	});

	describe('index()', function () {
		before(function () {
			return client.indices.putMapping({
				index : testIndex,
				type : testType,
				body : mapping
			});
		});

		after(function () {
			return client.indices.deleteMapping({
				index : testIndex,
				type : testType
			})
		});

		it('should reject if not including a root required field', function () {
			return client.index({
				index : testIndex,
				type : testType,
				body : {
					obj : {
						message2 : "hello"
					}
				}
			}).should.be.rejectedWith('Missing required field "message2"');
		});

		it('should reject if not including a nested required field', function () {
			return client.index({
				index : testIndex,
				type : testType,
				body : {
					message2 : "hello"
				}
			}).should.be.rejectedWith('Missing required field "obj.message2"');
		});

		it('should index when all values are present', function () {
			return client.index({
				index : testIndex,
				type : testType,
				body : {
					message2 : "hello",
					obj : {
						message2 : "hello"
					}
				}
			}).then(function (result) {
				result.created.should.equal(true);
			});
		});

		it('should consider null a valid value', function () {
			return client.index({
				index : testIndex,
				type : testType,
				body : {
					message2 : null,
					obj : {
						message2 : null
					}
				}
			}).then(function (result) {
				result.created.should.equal(true);
			});
		});
	});
});