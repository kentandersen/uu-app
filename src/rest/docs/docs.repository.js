var fs = require('fs');
var path = require("path");
var Q = require("q");
var glob = require("glob");
var NodeCache = require("node-cache");

var documentCache = new NodeCache({ stdTTL: 600, checkperiod: 30 });

var createDocObject = function(doc){
    return {
        key: doc.key,
        title: doc.title
    };
};

var readDocumentList = function(deferred) {
    glob("doc/*.json", function(err, docs) {
        if(err) {
            return deferred.reject(err);
        }

        // Read all documents
        var deferredArray = docs.map(function(doc) {
            var deff = Q.defer();
            var key = path.basename(doc, ".json");
            readDocument(deff, key);

            return deff.promise;
        });

        Q.all(deferredArray).then(function(resolution) {
            var documentList = resolution.map(createDocObject);
            deferred.resolve(documentList);
        }).fail(function (error) {
            deferred.reject(error);
        });


    });
};

var readDocument = function(deferred, key) {
    fs.readFile(path.join('doc', key + '.json'), function (err, data) {
        if (err) {
            deferred.reject(err);
            return;
        }
        data = JSON.parse(data);
        data.key = key;
        documentCache.set(key, data);
        deferred.resolve(data);
    });
};

var getAll = function() {
    var deferred = Q.defer();
    documentCache.get("allList", function(err, cachedData) {
        if(err) {
            deferred.require(err);
        } else if(cachedData["allList"]) {
            deferred.resolve(cachedData["allList"]);
        } else {
            readDocumentList(deferred);
        }
    });

    return deferred.promise;
};

var getOne = function(key) {
    var deferred = Q.defer();

    documentCache.get(key, function(err, cachedData){
        if(err){
            deferred.reject(err);
        } else if(cachedData[key]) {
            deferred.resolve(cachedData[key]);
        } else {
            readDocument(deferred, key);
        }
    });
    return deferred.promise;
};


exports.getAll = getAll;
exports.getOne = getOne;