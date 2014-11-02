var BaseView = require("../base/view");
var template = require("./template.hb");

var CardDetailsView = BaseView.extend({

  className: "detail",
  tagName: "article",

  template: template,

  initialize: function() {
    this.listenTo(this.model, "request", this.renderLoading);
    this.listenTo(this.model, "sync", this.render);
  },

  render: function() {
    var data = this.model.toJSON();
    data.colorid = this.model.getColorId();
    this.renderTemplate(data);
  }

});


module.exports = CardDetailsView;