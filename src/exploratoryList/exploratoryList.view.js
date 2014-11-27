var BaseView = require("../base/view");
var template = require("./template.hb");
var placement = require("./placement");
var utils = require("../common/utils");

var CardListView = BaseView.extend({

  template: template,

  className: "exploratory-list",

  initialize: function() {
    this.listenTo(this.collection, "request", this.renderLoading);
    this.listenTo(this.collection, "sync", this.render);

    this.collection.comparator = "importance";
    this.collection.sort();

    window.onscroll = utils.throttle(this.onWindowScroll, 100, this);
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

    placement(document.querySelectorAll(".item a"), this.getElementSize());
  },

  renderLoading: function() {
    this.el.innerHTML = "Laster spennende ting...";
  },

  getElementSize: function () {
    var bodyBoundingRect = document.body.getBoundingClientRect();
    var boundingRect = this.el.getBoundingClientRect();

    return {
      minHeight : boundingRect.top,
      minWidth  : boundingRect.left,
      width     : bodyBoundingRect.width - boundingRect.left,
      height    : bodyBoundingRect.height - boundingRect.top
    };
  },

  onWindowScroll: function() {

    var scrollTop = document.body.scrollTop;
    var sectionHeight = this.el.offsetHeight / 6;
    // var processPosition = scrollTop / sectionHeight;
    if(scrollTop < sectionHeight) {
      console.log("seksjon 1");

    } else if(scrollTop < sectionHeight*2) {
      console.log("seksjon 2");

    } else if(scrollTop < sectionHeight*3) {
      console.log("seksjon 3");

    } else if(scrollTop < sectionHeight*4) {
      console.log("seksjon 4");
    }

  },

  remove: function() {
    window.onscroll = null;
    BaseView.prototype.remove.apply(this, arguments);
  }

});


module.exports = CardListView;