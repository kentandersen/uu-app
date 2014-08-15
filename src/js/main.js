var template = require("./template.hb");
var $ = require('jquery');
var Backbone = require('backbone');
Backbone.$ = $;

var html = template({title: "An instantiated template!", name: "David"});

var view = new Backbone.View({
    el: "#main"
});