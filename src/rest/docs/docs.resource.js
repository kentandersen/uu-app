var path = require("path");
var repository = require("./docs.repository");

var creatDocumentUrl = function(documentKey) {
    return path.join("/rest/doc/", documentKey);
};

var initialize = function(app) {
    // setup apis
    app.get('/rest/doc', function(req, res) {
        repository.getAll().then(function(docs) {
            docs.forEach(function(docObj) {
                docObj.detailsUrl = creatDocumentUrl(docObj.key);
            });
            res.json(docs);
        });
    });

    app.get('/rest/doc/:key', function(req, res) {
        var key = req.params.key;
        repository.getOne(key).then(function(docs) {
            res.json(docs);
        });
    });

};




exports.init = initialize;