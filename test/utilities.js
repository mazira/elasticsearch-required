var http = require('http');
var Promise = require('bluebird');

/**
 * Used to totally kill an index before each test
 */
module.exports.removeIndex = function (index) {
	return new Promise(function (resolve, reject) {
		// check that the index exists
		http.request({
			port : 9200,
			path : '/' + index,
			method : 'DELETE'
		}, function (res) {
			res.resume();
			resolve();
		}).end();
	}).delay(100);
};

module.exports.refresh = function (index) {
	return new Promise(function (resolve, reject) {
		http.request({
			port : 9200,
			path : '/' + index + '/_refresh',
			method : 'POST'
		}, function (res) {
			res.resume();
			resolve();
		}).end();
	});
};

module.exports.getDocs = function (index, type) {
	var query = {
		"version" : true,
		"query" : {
			"match_all" : {}
		}
	};

	// check that the mapping exists
	return module.exports.refresh(index)
		.then(function () {
			return new Promise(function (resolve, reject) {
				http.request({
					port : 9200,
					path : '/' + index + '/' + type + '/_search',
					method : 'POST'
				}, function (res) {
					var data = '';
					res.on('data', function (chunk) {
						data += chunk;
					});
					res.on('end', function () {
						data = JSON.parse(data);
						if ( data.error )
							reject(new Error(data.error));
						else
							resolve(data.hits.hits);
					});
				}).end(JSON.stringify(query));
			})
		});
};

module.exports.getDoc = function (index, type) {
	return module.exports.getDocs(index, type)
		.then(function (docs) {
			docs.should.be.an('array').of.length(1);
			return docs[0];
		});
};

module.exports.getIndexSettings = function (index) {
	return new Promise(function (resolve, reject) {
		// check that the mapping exists
		http.request({
			port : 9200,
			path : '/' + index + '/_settings',
			method : 'GET'
		}, function (res) {
			var data = '';
			res.on('data', function (chunk) {
				data += chunk;
			});
			res.on('end', function () {
				data = JSON.parse(data);
				if ( data.error )
					reject(new Error(data.error));
				else
					resolve(data[index]['settings']);
			});
		}).end();
	});
};
