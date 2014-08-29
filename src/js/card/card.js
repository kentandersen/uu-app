var BaseModel = require("../base/model");

var CardModel = BaseModel.extend({

  idAttribute: "key",

  defaults: {
    "title": "",
    "key": "",
    "detailsUrl": ""
  }
});

module.exports = CardModel;