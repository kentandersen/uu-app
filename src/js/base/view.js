var Backbone = require('backbone');
var $ = require('jquery');
Backbone.$ = $;

var BaseView = Backbone.View.extend({

    renderTemplate: function(template, data) {
        if(!data && typeof template === "object") {
            template = this.template;
            data = template;
        } else if(!template) {
            template = this.template;
        }

        this.$el.html(template(data));
    }

});

module.exports = BaseView;