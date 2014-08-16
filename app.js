#!/usr/bin/env node
var path = require("path");
var express = require("express");

var app = express();

// Enable CORS
app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Origin", "*");
    next();
});

app.use(express.static(path.join(__dirname, "build")));


// setup resources
require("./src/rest/docs/docs.resource").init(app);


// if on port is set, use port.
var port = process.env.PORT || 1339;
app.listen(port);

console.log("app started of port " +  port);