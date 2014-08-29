var BaseView = require("../base/view");
var template = require("./template.hb");

var NavigationView = BaseView.extend({

  template: template,

  render: function() {
    this.renderTemplate();
  }

});

module.exports = NavigationView;