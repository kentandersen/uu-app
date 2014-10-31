var BaseModel = require("../base/model");

var AVAILABLE_COLORS_COUNT = 17;

var CardModel = BaseModel.extend({

  idAttribute: "key",

  defaults: {
    "title": "",
    "key": "",
    "detailsUrl": ""
  },

  getColorId: function() {
    return this.collection.indexOf(this) % AVAILABLE_COLORS_COUNT;
  }
});

module.exports = CardModel;