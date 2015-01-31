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
    var phase = this.getCurrentPhase();

    var data = this.collection.map(function(model) {
      var attrs = model.toJSON();
      attrs.importance = model.getImportance(phase);
      attrs.colorid = model.getColorId();
      attrs.cid = model.cid;

      return attrs;
    });

    this.renderTemplate(data);

    placement(document.querySelectorAll(".item a"), this.getElementSize());

    this._currentPhase = phase;
  },

  renderLoading: function() {
    this.el.innerHTML = "Laster spennende ting...";
  },

  getElementSize: function () {
    var bodyBoundingRect = document.body.getBoundingClientRect();
    var boundingRect = this.el.getBoundingClientRect();

    var minWidth  = boundingRect.left + document.body.scrollLeft;
    var minHeight = boundingRect.top + document.body.scrollTop;

    return {
      minWidth  : minWidth,
      minHeight : minHeight,
      width     : bodyBoundingRect.width - minWidth,
      height    : bodyBoundingRect.height - minHeight
    };
  },

  onWindowScroll: function() {
    var phase = this.getCurrentPhase();
    this.reevaluateImportance(phase);
  },

  remove: function() {
    window.onscroll = null;
    BaseView.prototype.remove.apply(this, arguments);
  },

  reevaluateImportance: function(phase) {
    if(phase === this._currentPhase) return;

    var elements = document.querySelectorAll(".item a");

    [].forEach.call(elements, function(element) {
      var cid = element.getAttribute("data-cid");
      var model = this.collection.get(cid);

      if(model) {
        var importance = model.getImportance(phase);
        element.className = element.className.replace(/importance-[\d]+/, "importance-" + importance);

      } else {
        element.remove();
      }

    }, this);
    placement(elements, this.getElementSize());

    this._currentPhase = phase;
  },

  getCurrentPhase: function() {
    var scrollTop = document.body.scrollTop;
    if(scrollTop < 0) {
      scrollTop = 0;
    }
    var sectionHeight = this.el.offsetHeight / 4;

    return Math.floor(scrollTop / sectionHeight);
  }

});


module.exports = CardListView;