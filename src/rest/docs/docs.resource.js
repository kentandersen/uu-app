var path = require("path");
var repository = require("./docs.repository");

var creatDocumentUrl = function(documentKey) {
    return path.join("/rest/kort/", documentKey);
};

var initialize = function(app) {
    // setup apis
    app.get('/rest/kort', function(req, res) {
        repository.getAll().then(function(docs) {
            docs.forEach(function(docObj) {
                docObj.detailsUrl = creatDocumentUrl(docObj.key);
            });
            res.json(docs);
        });
    });

    app.get('/rest/kort/:key', function(req, res) {
        var key = req.params.key;
        repository.getOne(key).then(function(docs) {
            res.json(docs);
        });
    });

};




exports.init = initialize;