var BaseView = require("../base/view");
var template = require("./template.hb");

var NavigationView = BaseView.extend({

  template: template,

  render: function() {
    var hash = window.location.hash.substr(1);

    this.renderTemplate({
        isListe         : hash === "" ||
                          hash === "liste",
        isExploratory   : hash === "exploratory",
        showBackButton  : hash !== "" &&
                          hash !== "liste" &&
                          hash !== "exploratory"
    });
  }

});

module.exports = NavigationView;