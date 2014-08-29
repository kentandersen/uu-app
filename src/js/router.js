var Backbone = require("backbone");
var CardListView = require("./cardList/cardList.view");
var CardDetailsView = require("./cardDetails/cardDetails.view");
var CardCollection = require("../card/cards");

var cardCollection = new CardCollection();

var Router = Backbone.Router.extend({

  routes: {
    "":               "listCards",
    "liste":          "listCards",
    "kort/:key":      "cardDetails"
  },

  listCards: function() {
    var cardListView = new CardListView({
      collection: cardCollection
    })
    cardListView.render();
  },

  cardDetails: function(key) {
    var cardDetailsView = new CardDetailsView({

    });
    cardDetailsView.render();
  }
});

module.exports = Router;