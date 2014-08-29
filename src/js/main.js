var Backbone = require("backbone");
var Router = require("./router");
var NavigationView = require("./navigation/navigation.view");


var navigationView = new NavigationView({
  el: "nav"
});
navigationView.render();

var router = new Router({
  nav: navigationView
});

Backbone.history.start();