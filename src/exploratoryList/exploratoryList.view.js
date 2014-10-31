// require("../../lib/isotope/isotope.pkgd");
// var Packery = window.Packery;

var BaseView = require("../base/view");
var template = require("./template.hb");
var CardListView = BaseView.extend({

  template: template,

  className: "exploratory-list",

  initialize: function() {
    this.listenTo(this.collection, "request", this.renderLoading);
    this.listenTo(this.collection, "sync", this.render);
  },

  render: function() {
    var data = this.collection.map(function(model) {
      var attrs = model.toJSON();
      // attrs.importance = model.getImportance();
      attrs.colorid = model.getColorId();

      return attrs;
    });

    this.renderTemplate(data);
  },

  renderLoading: function() {
    this.$el.html("Laster spennende ting...");
  }

});


module.exports = CardListView;