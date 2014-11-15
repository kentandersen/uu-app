var Exoskeleton = require("exoskeleton");
var NavigationView = require("../navigation/navigation.view");
var ExploratoryListView = require("../exploratoryList/exploratoryList.view");
var CardListView = require("../cardList/cardList.view");
var CardDetailsView = require("../cardDetails/cardDetails.view");
var CardCollection = require("../card/cards");
var CardModel = require("../card/card");

var cardCollection = new CardCollection();

var currentElement;
var changePage = function(view) {
  if(currentElement && currentElement.remove) {
    currentElement.remove();
  }

  currentElement = view;
  $("main").html(currentElement.$el);
};


var Router = Exoskeleton.Router.extend({

  routes: {
    "":               "listCards",
    "liste":          "listCards",
    "exploratory":    "exploratory",
    "kort/:key":      "cardDetails"
  },

  initialize: function(options) {
    this.navigationView = new NavigationView({
      el: "nav"
    });

    this.on("route", this.navigationView.render, this.navigationView);
  },

  exploratory: function() {
    var exploratoryView = new ExploratoryListView({
      collection: cardCollection
    });

    changePage.call(this, exploratoryView);
    cardCollection.fetch();
  },

  listCards: function() {
    var cardListView = new CardListView({
      collection: cardCollection
    });

    changePage.call(this, cardListView);
    cardListView.render();

    cardCollection.fetch();
  },

  cardDetails: function(key) {
    var cardModel = cardCollection.get(key) || cardCollection.add({key:key});

    var cardDetailsView = new CardDetailsView({
      model: cardModel
    });
    cardModel.fetch();

    changePage.call(this, cardDetailsView);
  },
});

module.exports = Router;