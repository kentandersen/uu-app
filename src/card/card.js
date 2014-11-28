var BaseModel = require("../base/model");

var AVAILABLE_COLORS_COUNT = 17;

var getRandomArbitrary = function(min, max) {
    return Math.round(Math.random() * (max - min) + min);
};


var CardModel = BaseModel.extend({

  idAttribute: "key",

  defaults: {
    "title": "",
    "key": "",
    "detailsUrl": ""
  },

  getColorId: function() {
    return this.collection.indexOf(this) % AVAILABLE_COLORS_COUNT;
  },

  getImportance: function(phase) {
    var importance = this.get("importance");

    if(typeof importance === "number"){
      importance = this.generateRandomImportance();
      this.set("importance", importance);
    }

    return importance[phase];
  },

  generateRandomImportance: function() {
    var arr = [];
    for (var i = 0; i < 7; i++) {
      arr.push(getRandomArbitrary(0, 2))
    };
    return arr;
  }
});

module.exports = CardModel;