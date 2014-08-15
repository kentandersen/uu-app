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

// json api
app.get('/rest/numbers', function(req, res) {
    res.json([1,3,4,5,6,7,7]);
});


// if on port is set, use port.
var port = process.env.PORT || 1339;
app.listen(port);

console.log("app started of port " +  port);