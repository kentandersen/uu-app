var $ = require("jquery");
var Backbone = require("backbone");
var CardListView = require("./cardList/cardList.view");
var CardDetailsView = require("./cardDetails/cardDetails.view");
var CardCollection = require("./card/cards");

var cardCollection = new CardCollection();

var currentElement;
var changePage = function(view) {
  if(currentElement && currentElement.remove) {
    currentElement.remove();
  }

  currentElement = view;
  $("main").html(currentElement.$el);
};


var Router = Backbone.Router.extend({

  routes: {
    "":               "listCards",
    "liste":          "listCards",
    "kort/:key":      "cardDetails"
  },

  initialize: function(options) {
    this.nav = options.nav;
  },

  listCards: function() {
    var cardListView = new CardListView({
      collection: cardCollection
    });

    changePage(cardListView);
    cardListView.render();

    cardCollection.fetch();
  },

  cardDetails: function(key) {
    var cardModel = cardCollection.get(key);
    var cardDetailsView = new CardDetailsView({
      model: cardModel
    });
    cardModel.fetch();

    changePage(cardDetailsView);
  },
});

module.exports = Router;