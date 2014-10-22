var BaseView = require("../base/view");
var template = require("./template.hb");

var CardDetailsView = BaseView.extend({

  template: template,

  initialize: function() {
    this.listenTo(this.model, "request", this.renderLoading);
    this.listenTo(this.model, "sync", this.render);
  },

  render: function() {
    this.renderTemplate(this.model.toJSON());
  }

});


module.exports = CardDetailsView;