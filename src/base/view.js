require("backbone.nativeview");
var Exoskeleton = require("exoskeleton");

var BaseView = Exoskeleton.NativeView.extend({

  renderTemplate: function(template, data) {
    if(!data && typeof template === "object") {
      data = template;
      template = this.template;
    } else if(!template) {
      template = this.template;
    }

    this.$el.html(template(data));
  }

});

module.exports = BaseView;