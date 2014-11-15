var BaseView = require("../base/view");
var template = require("./template.hb");
var placement = require("./placement");

var CardListView = BaseView.extend({

  template: template,

  className: "exploratory-list",

  initialize: function() {
    this.listenTo(this.collection, "request", this.renderLoading);
    this.listenTo(this.collection, "sync", this.render);

    this.collection.comparator = "importance";
    this.collection.sort();
  },

  render: function() {
    var size = this.getElementSize();

    var data = this.collection.map(function(model) {
      var attrs = model.toJSON();
      // attrs.importance = model.getImportance();
      attrs.colorid = model.getColorId();

      return attrs;
    });

    this.renderTemplate(data);

    placement(document.querySelectorAll(".item a"), size.height, size.width);
  },

  renderLoading: function() {
    this.el.innerHTML("Laster spennende ting...");
  },

  getElementSize: function () {
    return {
      width: this.el.offsetWidth,
      height: this.el.offsetHeight
    };
  }

});


module.exports = CardListView;