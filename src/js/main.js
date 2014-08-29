var BaseView = require("./base/view");
var template = require("./template.hb");

var html = template({title: "An instantiated template!", name: "David"});

var view = new BaseView({
    el: "#main"
});