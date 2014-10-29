var BaseCollection = require("../base/collection");
var CardModel = require("./card");

var CardCollection = BaseCollection.extend({

  model: CardModel,

  url: "rest/kort",

  comparator: "title"

});

module.exports = CardCollection;