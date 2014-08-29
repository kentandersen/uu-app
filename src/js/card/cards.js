var BaseCollection = require("../base/collection");
var CardModel = require("./card");

var CardCollection = BaseCollection.extend({
    model: CardModel
});

module.exports = CardCollection;