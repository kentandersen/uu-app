var fs = require('fs');
var path = require("path");
var extend = require('util')._extend;
var Q = require("q");
var glob = require("glob");
var NodeCache = require("node-cache");

var documentCache = new NodeCache({ stdTTL: 60, checkperiod: 10 });
var metaCache     = new NodeCache({ stdTTL: 60, checkperiod: 10 });

var parseDocumentObject = function(doc){
    return doc;
};

var parseMetaObject = function(doc){
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
        var deferredArray = docs.map(function(docSrc) {
            var deff = Q.defer();
            var key = path.basename(docSrc, ".json");

            metaCache.get(key, function(err, cachedData) {
                if(err){
                    deff.reject(err);
                } else if(cachedData[key]) {
                    deff.resolve(cachedData[key]);
                } else {
                    var tmpDefer = Q.defer();
                    readDocument(tmpDefer, key);

                    tmpDefer.promise.then(function(doc) {
                        deff.resolve(parseMetaObject(doc));
                    });
                }
            });

            return deff.promise;
        });

        Q.all(deferredArray).then(function(documentList) {
            deferred.resolve(documentList);
        }).fail(function (error) {
            deferred.reject(error);
        });


    });
};

var readDocument = function(deferred, key) {
    fs.readFile(path.join('doc', key + '.json'), function (err, data) {
        if (err) {
            return deferred.reject(err);
        }
        data = JSON.parse(data);
        data.key = key;

        documentCache.set(key, parseDocumentObject(data));
        metaCache.set(key, parseMetaObject(data));
        deferred.resolve(data);
    });
};

var getAll = function() {
    var deferred = Q.defer();
    readDocumentList(deferred);

    // clone object to unwanted prevent modification
    return deferred.promise.then(function(documentList) {
        return documentList.map(function(doc) {
            return extend({}, doc);
        });
    });
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

    // clone object to unwanted prevent modification
    return deferred.promise.then(function(doc) {
        return extend({}, doc);
    });
};


exports.getAll = getAll;
exports.getOne = getOne;