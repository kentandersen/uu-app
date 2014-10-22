var BaseView = require("../base/view");
var template = require("./template.hb");

var CardListView = BaseView.extend({

  template: template,

  className: "card-list",

  initialize: function() {
    this.listenTo(this.collection, "request", this.renderLoading);
    this.listenTo(this.collection, "sync", this.render);
  },

  render: function() {
    this.renderTemplate(this.collection.toJSON());
  },

  renderLoading: function() {
    this.$el.html("Laster spennende ting...");
  }

});


module.exports = CardListView;