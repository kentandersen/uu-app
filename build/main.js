require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Backbone.NativeAjax.js 0.2.0
// ---------------

//     (c) 2014 Adam Krebs, Paul Miller, Exoskeleton Project
//     Backbone.NativeAjax may be freely distributed under the MIT license.
//     For all details and documentation:
//     https://github.com/akre54/Backbone.NativeAjax

(function (factory) {
  if (typeof define === 'function' && define.amd) { define(['backbone'], factory);
  } else if (typeof exports === 'object') { factory(require('backbone'));
  } else { factory(Backbone); }
}(function (Backbone) {
  // Make an AJAX request to the server.
  // Usage:
  //   var req = Backbone.ajax({url: 'url', type: 'PATCH', data: 'data'});
  //   req.done(...).error(...) // if Backbone.Deferred is set
  Backbone.ajax = (function() {
    var xmlRe = /^(?:application|text)\/xml/;
    var jsonRe = /^application\/json/;

    var getData = function(accepts, xhr) {
      if (accepts == null) accepts = xhr.getResponseHeader('content-type');
      if (xmlRe.test(accepts)) {
        return xhr.responseXML;
      } else if (jsonRe.test(accepts)) {
        return JSON.parse(xhr.responseText);
      } else {
        return xhr.responseText;
      }
    };

    var isValid = function(xhr) {
      return (xhr.status >= 200 && xhr.status < 300) ||
        (xhr.status === 304) ||
        (xhr.status === 0 && window.location.protocol === 'file:')
    };

    var end = function(xhr, options, deferred) {
      return function() {
        if (xhr.readyState !== 4) return;

        var status = xhr.status;
        var data = getData(options.headers && options.headers.Accept, xhr);

        // Check for validity.
        if (isValid(xhr)) {
          if (options.success) options.success(data);
          if (deferred) deferred.resolve(data);
        } else {
          var error = new Error('Server responded with a status of ' + status);
          if (options.error) options.error(xhr, status, error);
          if (deferred) deferred.reject(xhr);
        }
      }
    };

    return function(options) {
      if (options == null) throw new Error('You must provide options');
      if (options.type == null) options.type = 'GET';

      var xhr = new XMLHttpRequest();
      var deferred = Backbone.Deferred && Backbone.Deferred();

      if (options.contentType) {
        if (options.headers == null) options.headers = {};
        options.headers['Content-Type'] = options.contentType;
      }

      // Stringify GET query params.
      if (options.type === 'GET' && typeof options.data === 'object') {
        var query = '';
        var stringifyKeyValuePair = function(key, value) {
          return value == null ? '' :
            '&' + encodeURIComponent(key) +
            '=' + encodeURIComponent(value);
        };
        for (var key in options.data) {
          query += stringifyKeyValuePair(key, options.data[key]);
        }

        if (query) {
          var sep = (options.url.indexOf('?') === -1) ? '?' : '&';
          options.url += sep + query.substring(1);
        }
      }

      if (options.credentials) options.withCredentials = true;
      xhr.addEventListener('readystatechange', end(xhr, options, deferred));
      xhr.open(options.type, options.url, true);

      var allTypes = "*/".concat("*");
      var xhrAccepts = {
        "*": allTypes,
        text: "text/plain",
        html: "text/html",
        xml: "application/xml, text/xml",
        json: "application/json, text/javascript"
      };
      xhr.setRequestHeader(
        "Accept",
        options.dataType && xhrAccepts[options.dataType] ?
          xhrAccepts[options.dataType] + (options.dataType !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
          xhrAccepts["*"]
      );

      if (options.headers) for (var key in options.headers) {
        xhr.setRequestHeader(key, options.headers[key]);
      }
      if (options.beforeSend) options.beforeSend(xhr);
      xhr.send(options.data);

      return deferred ? deferred.promise : undefined;
    };
  })();
}));

},{"backbone":"backbone"}],2:[function(require,module,exports){
// Backbone.NativeView.js 0.3.2
// ---------------

//     (c) 2014 Adam Krebs, Jimmy Yuen Ho Wong
//     Backbone.NativeView may be freely distributed under the MIT license.
//     For all details and documentation:
//     https://github.com/akre54/Backbone.NativeView

(function (factory) {
  if (typeof define === 'function' && define.amd) { define(['backbone'], factory);
  } else if (typeof exports === 'object') { factory(require('backbone'));
  } else { factory(Backbone); }
}(function (Backbone) {
  // Cached regex to match an opening '<' of an HTML tag, possibly left-padded
  // with whitespace.
  var paddedLt = /^\s*</;

  // Caches a local reference to `Element.prototype` for faster access.
  var ElementProto = (typeof Element !== 'undefined' && Element.prototype) || {};

  // Cross-browser event listener shims
  var elementAddEventListener = ElementProto.addEventListener || function(eventName, listener) {
    return this.attachEvent('on' + eventName, listener);
  }
  var elementRemoveEventListener = ElementProto.removeEventListener || function(eventName, listener) {
    return this.detachEvent('on' + eventName, listener);
  }

  var indexOf = function(array, item) {
    for (var i = 0, len = array.length; i < len; i++) if (array[i] === item) return i;
    return -1;
  }

  // Find the right `Element#matches` for IE>=9 and modern browsers.
  var matchesSelector = ElementProto.matches ||
      ElementProto.webkitMatchesSelector ||
      ElementProto.mozMatchesSelector ||
      ElementProto.msMatchesSelector ||
      ElementProto.oMatchesSelector ||
      // Make our own `Element#matches` for IE8
      function(selector) {
        // Use querySelectorAll to find all elements matching the selector,
        // then check if the given element is included in that list.
        // Executing the query on the parentNode reduces the resulting nodeList,
        // (document doesn't have a parentNode).
        var nodeList = (this.parentNode || document).querySelectorAll(selector) || [];
        return !!~indexOf(nodeList, this);
      };

  // Cache Backbone.View for later access in constructor
  var BBView = Backbone.View;

  // To extend an existing view to use native methods, extend the View prototype
  // with the mixin: _.extend(MyView.prototype, Backbone.NativeViewMixin);
  Backbone.NativeViewMixin = {

    _domEvents: null,

    constructor: function() {
      this._domEvents = [];
      return BBView.apply(this, arguments);
    },

    $: function(selector) {
      return this.el.querySelectorAll(selector);
    },

    _removeElement: function() {
      this.undelegateEvents();
      if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
    },

    // Apply the `element` to the view. `element` can be a CSS selector,
    // a string of HTML, or an Element node.
    _setElement: function(element) {
      if (typeof element == 'string') {
        if (paddedLt.test(element)) {
          var el = document.createElement('div');
          el.innerHTML = element;
          this.el = el.firstChild;
        } else {
          this.el = document.querySelector(element);
        }
      } else {
        this.el = element;
      }
    },

    // Set a hash of attributes to the view's `el`. We use the "prop" version
    // if available, falling back to `setAttribute` for the catch-all.
    _setAttributes: function(attrs) {
      for (var attr in attrs) {
        attr in this.el ? this.el[attr] = attrs[attr] : this.el.setAttribute(attr, attrs[attr]);
      }
    },

    // Make a event delegation handler for the given `eventName` and `selector`
    // and attach it to `this.el`.
    // If selector is empty, the listener will be bound to `this.el`. If not, a
    // new handler that will recursively traverse up the event target's DOM
    // hierarchy looking for a node that matches the selector. If one is found,
    // the event's `delegateTarget` property is set to it and the return the
    // result of calling bound `listener` with the parameters given to the
    // handler.
    delegate: function(eventName, selector, listener) {
      if (typeof selector === 'function') {
        listener = selector;
        selector = null;
      }

      var root = this.el;
      var handler = selector ? function (e) {
        var node = e.target || e.srcElement;
        for (; node && node != root; node = node.parentNode) {
          if (matchesSelector.call(node, selector)) {
            e.delegateTarget = node;
            listener(e);
          }
        }
      } : listener;

      elementAddEventListener.call(this.el, eventName, handler, false);
      this._domEvents.push({eventName: eventName, handler: handler, listener: listener, selector: selector});
      return handler;
    },

    // Remove a single delegated event. Either `eventName` or `selector` must
    // be included, `selector` and `listener` are optional.
    undelegate: function(eventName, selector, listener) {
      if (typeof selector === 'function') {
        listener = selector;
        selector = null;
      }

      if (this.el) {
        var handlers = this._domEvents.slice();
        for (var i = 0, len = handlers.length; i < len; i++) {
          var item = handlers[i];

          var match = item.eventName === eventName &&
              (listener ? item.listener === listener : true) &&
              (selector ? item.selector === selector : true);

          if (!match) continue;

          elementRemoveEventListener.call(this.el, item.eventName, item.handler, false);
          this._domEvents.splice(indexOf(handlers, item), 1);
        }
      }
      return this;
    },

    // Remove all events created with `delegate` from `el`
    undelegateEvents: function() {
      if (this.el) {
        for (var i = 0, len = this._domEvents.length; i < len; i++) {
          var item = this._domEvents[i];
          elementRemoveEventListener.call(this.el, item.eventName, item.handler, false);
        };
        this._domEvents.length = 0;
      }
      return this;
    }
  };

  Backbone.NativeView = Backbone.View.extend(Backbone.NativeViewMixin);

  return Backbone.NativeView;
}));

},{"backbone":"backbone"}],3:[function(require,module,exports){

},{}],4:[function(require,module,exports){
/*!
 * Exoskeleton.js 0.7.0
 * (c) 2013 Paul Miller <http://paulmillr.com>
 * Based on Backbone.js
 * (c) 2010-2013 Jeremy Ashkenas, DocumentCloud
 * Exoskeleton may be freely distributed under the MIT license.
 * For all details and documentation: <http://exosjs.com>
 */

(function(root, factory) {
  // Set up Backbone appropriately for the environment.
  if (typeof define === 'function' && define.amd) {
    define(['underscore', 'jquery', 'exports'], function(_, $, exports) {
      root.Backbone = root.Exoskeleton = factory(root, exports, _, $);
    });
  } else if (typeof exports !== 'undefined') {
    var _, $;
    try { _ = require('underscore'); } catch(e) { }
    try { $ = require('jquery'); } catch(e) { }
    factory(root, exports, _, $);
  } else {
    root.Backbone = root.Exoskeleton = factory(root, {}, root._, (root.jQuery || root.Zepto || root.ender || root.$));
  }

})(this, function(root, Backbone, _, $) {
  'use strict';

  // Initial Setup
  // -------------

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;
  var previousExoskeleton = root.Exoskeleton;

  // Underscore replacement.
  var utils = Backbone.utils = _ = (_ || {});

  // Hold onto a local reference to `$`. Can be changed at any point.
  Backbone.$ = $;

  // Create local references to array methods we'll want to use later.
  var array = [];
  var push = array.push;
  var slice = array.slice;
  var toString = ({}).toString;

  // Current version of the library. Keep in sync with `package.json`.
  // Backbone.VERSION = '1.0.0';

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    root.Exoskeleton = previousExoskeleton;
    return this;
  };

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  Backbone.extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

  // Wrap an optional error callback with a fallback error event.
  var wrapError = function(model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error(model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

  // Checker for utility methods. Useful for custom builds.
  var utilExists = function(method) {
    return typeof _[method] === 'function';
  };
utils.result = function result(object, property) {
  var value = object ? object[property] : undefined;
  return typeof value === 'function' ? object[property]() : value;
};

utils.defaults = function defaults(obj) {
  slice.call(arguments, 1).forEach(function(item) {
    for (var key in item) if (obj[key] === undefined)
      obj[key] = item[key];
  });
  return obj;
};

utils.extend = function extend(obj) {
  slice.call(arguments, 1).forEach(function(item) {
    for (var key in item) obj[key] = item[key];
  });
  return obj;
};

var htmlEscapes = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

utils.escape = function escape(string) {
  return string == null ? '' : String(string).replace(/[&<>"']/g, function(match) {
    return htmlEscapes[match];
  });
};

utils.sortBy = function(obj, value, context) {
  var iterator = typeof value === 'function' ? value : function(obj){ return obj[value]; };
  return obj
    .map(function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    })
    .sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    })
    .map(function(item) {
      return item.value;
    });
};

/** Used to generate unique IDs */
var idCounter = 0;

utils.uniqueId = function uniqueId(prefix) {
  var id = ++idCounter + '';
  return prefix ? prefix + id : id;
};

utils.has = function(obj, key) {
  return Object.hasOwnProperty.call(obj, key);
};

var eq = function(a, b, aStack, bStack) {
  // Identical objects are equal. `0 === -0`, but they aren't identical.
  // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
  if (a === b) return a !== 0 || 1 / a == 1 / b;
  // A strict comparison is necessary because `null == undefined`.
  if (a == null || b == null) return a === b;
  // Unwrap any wrapped objects.
  //if (a instanceof _) a = a._wrapped;
  //if (b instanceof _) b = b._wrapped;
  // Compare `[[Class]]` names.
  var className = toString.call(a);
  if (className != toString.call(b)) return false;
  switch (className) {
    // Strings, numbers, dates, and booleans are compared by value.
    case '[object String]':
      // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
      // equivalent to `new String("5")`.
      return a == String(b);
    case '[object Number]':
      // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
      // other numeric values.
      return a !== +a ? b !== +b : (a === 0 ? 1 / a === 1 / b : a === +b);
    case '[object Date]':
    case '[object Boolean]':
      // Coerce dates and booleans to numeric primitive values. Dates are compared by their
      // millisecond representations. Note that invalid dates with millisecond representations
      // of `NaN` are not equivalent.
      return +a == +b;
    // RegExps are compared by their source patterns and flags.
    case '[object RegExp]':
      return a.source == b.source &&
             a.global == b.global &&
             a.multiline == b.multiline &&
             a.ignoreCase == b.ignoreCase;
  }
  if (typeof a != 'object' || typeof b != 'object') return false;
  // Assume equality for cyclic structures. The algorithm for detecting cyclic
  // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
  var length = aStack.length;
  while (length--) {
    // Linear search. Performance is inversely proportional to the number of
    // unique nested structures.
    if (aStack[length] == a) return bStack[length] == b;
  }
  // Objects with different constructors are not equivalent, but `Object`s
  // from different frames are.
  var aCtor = a.constructor, bCtor = b.constructor;
  if (aCtor !== bCtor && !(typeof aCtor === 'function' && (aCtor instanceof aCtor) &&
                           typeof bCtor === 'function' && (bCtor instanceof bCtor))) {
    return false;
  }
  // Add the first object to the stack of traversed objects.
  aStack.push(a);
  bStack.push(b);
  var size = 0, result = true;
  // Recursively compare objects and arrays.
  if (className === '[object Array]') {
    // Compare array lengths to determine if a deep comparison is necessary.
    size = a.length;
    result = size === b.length;
    if (result) {
      // Deep compare the contents, ignoring non-numeric properties.
      while (size--) {
        if (!(result = eq(a[size], b[size], aStack, bStack))) break;
      }
    }
  } else {
    // Deep compare objects.
    for (var key in a) {
      if (_.has(a, key)) {
        // Count the expected number of properties.
        size++;
        // Deep compare each member.
        if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
      }
    }
    // Ensure that both objects contain the same number of properties.
    if (result) {
      for (key in b) {
        if (_.has(b, key) && !(size--)) break;
      }
      result = !size;
    }
  }
  // Remove the first object from the stack of traversed objects.
  aStack.pop();
  bStack.pop();
  return result;
};

// Perform a deep comparison to check if two objects are equal.
utils.isEqual = function(a, b) {
  return eq(a, b, [], []);
};
// Backbone.Events
// ---------------

// A module that can be mixed in to *any object* in order to provide it with
// custom events. You may bind with `on` or remove with `off` callback
// functions to an event; `trigger`-ing an event fires all callbacks in
// succession.
//
//     var object = {};
//     _.extend(object, Backbone.Events);
//     object.on('expand', function(){ alert('expanded'); });
//     object.trigger('expand');
//
var Events = Backbone.Events = {

  // Bind an event to a `callback` function. Passing `"all"` will bind
  // the callback to all events fired.
  on: function(name, callback, context) {
    if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
    this._events || (this._events = {});
    var events = this._events[name] || (this._events[name] = []);
    events.push({callback: callback, context: context, ctx: context || this});
    return this;
  },

  // Bind an event to only be triggered a single time. After the first time
  // the callback is invoked, it will be removed.
  once: function(name, callback, context) {
    if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
    var self = this;
    var ran;
    var once = function() {
      if (ran) return;
      ran = true;
      self.off(name, once);
      callback.apply(this, arguments);
    };
    once._callback = callback;
    return this.on(name, once, context);
  },

  // Remove one or many callbacks. If `context` is null, removes all
  // callbacks with that function. If `callback` is null, removes all
  // callbacks for the event. If `name` is null, removes all bound
  // callbacks for all events.
  off: function(name, callback, context) {
    var retain, ev, events, names, i, l, j, k;
    if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
    if (!name && !callback && !context) {
      this._events = void 0;
      return this;
    }
    names = name ? [name] : Object.keys(this._events);
    for (i = 0, l = names.length; i < l; i++) {
      name = names[i];
      if (events = this._events[name]) {
        this._events[name] = retain = [];
        if (callback || context) {
          for (j = 0, k = events.length; j < k; j++) {
            ev = events[j];
            if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                (context && context !== ev.context)) {
              retain.push(ev);
            }
          }
        }
        if (!retain.length) delete this._events[name];
      }
    }

    return this;
  },

  // Trigger one or many events, firing all bound callbacks. Callbacks are
  // passed the same arguments as `trigger` is, apart from the event name
  // (unless you're listening on `"all"`, which will cause your callback to
  // receive the true name of the event as the first argument).
  trigger: function(name) {
    if (!this._events) return this;
    var args = slice.call(arguments, 1);
    if (!eventsApi(this, 'trigger', name, args)) return this;
    var events = this._events[name];
    var allEvents = this._events.all;
    if (events) triggerEvents(events, args);
    if (allEvents) triggerEvents(allEvents, arguments);
    return this;
  },

  // Tell this object to stop listening to either specific events ... or
  // to every object it's currently listening to.
  stopListening: function(obj, name, callback) {
    var listeningTo = this._listeningTo;
    if (!listeningTo) return this;
    var remove = !name && !callback;
    if (!callback && typeof name === 'object') callback = this;
    if (obj) (listeningTo = {})[obj._listenId] = obj;
    for (var id in listeningTo) {
      obj = listeningTo[id];
      obj.off(name, callback, this);
      if (remove || !Object.keys(obj._events).length) delete this._listeningTo[id];
    }
    return this;
  }

};

// Regular expression used to split event strings.
var eventSplitter = /\s+/;

// Implement fancy features of the Events API such as multiple event
// names `"change blur"` and jQuery-style event maps `{change: action}`
// in terms of the existing API.
var eventsApi = function(obj, action, name, rest) {
  if (!name) return true;

  // Handle event maps.
  if (typeof name === 'object') {
    for (var key in name) {
      obj[action].apply(obj, [key, name[key]].concat(rest));
    }
    return false;
  }

  // Handle space separated event names.
  if (eventSplitter.test(name)) {
    var names = name.split(eventSplitter);
    for (var i = 0, l = names.length; i < l; i++) {
      obj[action].apply(obj, [names[i]].concat(rest));
    }
    return false;
  }

  return true;
};

// A difficult-to-believe, but optimized internal dispatch function for
// triggering events. Tries to keep the usual cases speedy (most internal
// Backbone events have 3 arguments).
var triggerEvents = function(events, args) {
  var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
  switch (args.length) {
    case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
    case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
    case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
    case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
    default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args); return;
  }
};

var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

// Inversion-of-control versions of `on` and `once`. Tell *this* object to
// listen to an event in another object ... keeping track of what it's
// listening to.
Object.keys(listenMethods).forEach(function(method) {
  var implementation = listenMethods[method];
  Events[method] = function(obj, name, callback) {
    var listeningTo = this._listeningTo || (this._listeningTo = {});
    var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
    listeningTo[id] = obj;
    if (!callback && typeof name === 'object') callback = this;
    obj[implementation](name, callback, this);
    return this;
  };
});

// Aliases for backwards compatibility.
Events.bind   = Events.on;
Events.unbind = Events.off;

// Allow the `Backbone` object to serve as a global event bus, for folks who
// want global "pubsub" in a convenient place.
_.extend(Backbone, Events);
// Backbone.Model
// --------------

// Backbone **Models** are the basic data object in the framework --
// frequently representing a row in a table in a database on your server.
// A discrete chunk of data and a bunch of useful, related methods for
// performing computations and transformations on that data.

// Create a new model with the specified attributes. A client id (`cid`)
// is automatically generated and assigned for you.
var Model = Backbone.Model = function(attributes, options) {
  var attrs = attributes || {};
  options || (options = {});
  this.cid = _.uniqueId('c');
  this.attributes = Object.create(null);
  if (options.collection) this.collection = options.collection;
  if (options.parse) attrs = this.parse(attrs, options) || {};
  attrs = _.defaults({}, attrs, _.result(this, 'defaults'));
  this.set(attrs, options);
  this.changed = Object.create(null);
  this.initialize.apply(this, arguments);
};

// Attach all inheritable methods to the Model prototype.
_.extend(Model.prototype, Events, {

  // A hash of attributes whose current and previous value differ.
  changed: null,

  // The value returned during the last failed validation.
  validationError: null,

  // The default name for the JSON `id` attribute is `"id"`. MongoDB and
  // CouchDB users may want to set this to `"_id"`.
  idAttribute: 'id',

  // Initialize is an empty function by default. Override it with your own
  // initialization logic.
  initialize: function(){},

  // Return a copy of the model's `attributes` object.
  toJSON: function(options) {
    return _.extend({}, this.attributes);
  },

  // Proxy `Backbone.sync` by default -- but override this if you need
  // custom syncing semantics for *this* particular model.
  sync: function() {
    return Backbone.sync.apply(this, arguments);
  },

  // Get the value of an attribute.
  get: function(attr) {
    return this.attributes[attr];
  },

  // Get the HTML-escaped value of an attribute.
  escape: function(attr) {
    return _.escape(this.get(attr));
  },

  // Returns `true` if the attribute contains a value that is not null
  // or undefined.
  has: function(attr) {
    return this.get(attr) != null;
  },

  // Set a hash of model attributes on the object, firing `"change"`. This is
  // the core primitive operation of a model, updating the data and notifying
  // anyone who needs to know about the change in state. The heart of the beast.
  set: function(key, val, options) {
    var attr, attrs, unset, changes, silent, changing, prev, current;
    if (key == null) return this;

    // Handle both `"key", value` and `{key: value}` -style arguments.
    if (typeof key === 'object') {
      attrs = key;
      options = val;
    } else {
      (attrs = {})[key] = val;
    }

    options || (options = {});

    // Run validation.
    if (!this._validate(attrs, options)) return false;

    // Extract attributes and options.
    unset           = options.unset;
    silent          = options.silent;
    changes         = [];
    changing        = this._changing;
    this._changing  = true;

    if (!changing) {
      this._previousAttributes = _.extend(Object.create(null), this.attributes);
      this.changed = {};
    }
    current = this.attributes, prev = this._previousAttributes;

    // Check for changes of `id`.
    if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

    // For each `set` attribute, update or delete the current value.
    for (attr in attrs) {
      val = attrs[attr];
      if (!_.isEqual(current[attr], val)) changes.push(attr);
      if (!_.isEqual(prev[attr], val)) {
        this.changed[attr] = val;
      } else {
        delete this.changed[attr];
      }
      unset ? delete current[attr] : current[attr] = val;
    }

    // Trigger all relevant attribute changes.
    if (!silent) {
      if (changes.length) this._pending = options;
      for (var i = 0, l = changes.length; i < l; i++) {
        this.trigger('change:' + changes[i], this, current[changes[i]], options);
      }
    }

    // You might be wondering why there's a `while` loop here. Changes can
    // be recursively nested within `"change"` events.
    if (changing) return this;
    if (!silent) {
      while (this._pending) {
        options = this._pending;
        this._pending = false;
        this.trigger('change', this, options);
      }
    }
    this._pending = false;
    this._changing = false;
    return this;
  },

  // Remove an attribute from the model, firing `"change"`. `unset` is a noop
  // if the attribute doesn't exist.
  unset: function(attr, options) {
    return this.set(attr, void 0, _.extend({}, options, {unset: true}));
  },

  // Clear all attributes on the model, firing `"change"`.
  clear: function(options) {
    var attrs = {};
    for (var key in this.attributes) attrs[key] = void 0;
    return this.set(attrs, _.extend({}, options, {unset: true}));
  },

  // Determine if the model has changed since the last `"change"` event.
  // If you specify an attribute name, determine if that attribute has changed.
  hasChanged: function(attr) {
    if (attr == null) return !!Object.keys(this.changed).length;
    return _.has(this.changed, attr);
  },

  // Return an object containing all the attributes that have changed, or
  // false if there are no changed attributes. Useful for determining what
  // parts of a view need to be updated and/or what attributes need to be
  // persisted to the server. Unset attributes will be set to undefined.
  // You can also pass an attributes object to diff against the model,
  // determining if there *would be* a change.
  changedAttributes: function(diff) {
    if (!diff) return this.hasChanged() ? _.extend(Object.create(null), this.changed) : false;
    var val, changed = false;
    var old = this._changing ? this._previousAttributes : this.attributes;
    for (var attr in diff) {
      if (_.isEqual(old[attr], (val = diff[attr]))) continue;
      (changed || (changed = {}))[attr] = val;
    }
    return changed;
  },

  // Get the previous value of an attribute, recorded at the time the last
  // `"change"` event was fired.
  previous: function(attr) {
    if (attr == null || !this._previousAttributes) return null;
    return this._previousAttributes[attr];
  },

  // Get all of the attributes of the model at the time of the previous
  // `"change"` event.
  previousAttributes: function() {
    return _.extend(Object.create(null), this._previousAttributes);
  },

  // Fetch the model from the server. If the server's representation of the
  // model differs from its current attributes, they will be overridden,
  // triggering a `"change"` event.
  fetch: function(options) {
    options = options ? _.extend({}, options) : {};
    if (options.parse === void 0) options.parse = true;
    var model = this;
    var success = options.success;
    options.success = function(resp) {
      if (!model.set(model.parse(resp, options), options)) return false;
      if (success) success(model, resp, options);
      model.trigger('sync', model, resp, options);
    };
    wrapError(this, options);
    return this.sync('read', this, options);
  },

  // Set a hash of model attributes, and sync the model to the server.
  // If the server returns an attributes hash that differs, the model's
  // state will be `set` again.
  save: function(key, val, options) {
    var attrs, method, xhr, attributes = this.attributes;

    // Handle both `"key", value` and `{key: value}` -style arguments.
    if (key == null || typeof key === 'object') {
      attrs = key;
      options = val;
    } else {
      (attrs = {})[key] = val;
    }

    options = _.extend({validate: true}, options);

    // If we're not waiting and attributes exist, save acts as
    // `set(attr).save(null, opts)` with validation. Otherwise, check if
    // the model will be valid when the attributes, if any, are set.
    if (attrs && !options.wait) {
      if (!this.set(attrs, options)) return false;
    } else {
      if (!this._validate(attrs, options)) return false;
    }

    // Set temporary attributes if `{wait: true}`.
    if (attrs && options.wait) {
      this.attributes = _.extend(Object.create(null), attributes, attrs);
    }

    // After a successful server-side save, the client is (optionally)
    // updated with the server-side state.
    if (options.parse === void 0) options.parse = true;
    var model = this;
    var success = options.success;
    options.success = function(resp) {
      // Ensure attributes are restored during synchronous saves.
      model.attributes = attributes;
      var serverAttrs = model.parse(resp, options);
      if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
      if (serverAttrs && typeof serverAttrs === 'object' && !model.set(serverAttrs, options)) {
        return false;
      }
      if (success) success(model, resp, options);
      model.trigger('sync', model, resp, options);
    };
    wrapError(this, options);

    method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
    if (method === 'patch') options.attrs = attrs;
    xhr = this.sync(method, this, options);

    // Restore attributes.
    if (attrs && options.wait) this.attributes = attributes;

    return xhr;
  },

  // Destroy this model on the server if it was already persisted.
  // Optimistically removes the model from its collection, if it has one.
  // If `wait: true` is passed, waits for the server to respond before removal.
  destroy: function(options) {
    options = options ? _.extend({}, options) : {};
    var model = this;
    var success = options.success;

    var destroy = function() {
      model.trigger('destroy', model, model.collection, options);
    };

    options.success = function(resp) {
      if (options.wait || model.isNew()) destroy();
      if (success) success(model, resp, options);
      if (!model.isNew()) model.trigger('sync', model, resp, options);
    };

    if (this.isNew()) {
      options.success();
      return false;
    }
    wrapError(this, options);

    var xhr = this.sync('delete', this, options);
    if (!options.wait) destroy();
    return xhr;
  },

  // Default URL for the model's representation on the server -- if you're
  // using Backbone's restful methods, override this to change the endpoint
  // that will be called.
  url: function() {
    var base =
      _.result(this, 'urlRoot') ||
      _.result(this.collection, 'url') ||
      urlError();
    if (this.isNew()) return base;
    return base.replace(/([^\/])$/, '$1/') + encodeURIComponent(this.id);
  },

  // **parse** converts a response into the hash of attributes to be `set` on
  // the model. The default implementation is just to pass the response along.
  parse: function(resp, options) {
    return resp;
  },

  // Create a new model with identical attributes to this one.
  clone: function() {
    return new this.constructor(this.attributes);
  },

  // A model is new if it has never been saved to the server, and lacks an id.
  isNew: function() {
    return !this.has(this.idAttribute);
  },

  // Check if the model is currently in a valid state.
  isValid: function(options) {
    return this._validate({}, _.extend(options || {}, { validate: true }));
  },

  // Run validation against the next complete set of model attributes,
  // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
  _validate: function(attrs, options) {
    if (!options.validate || !this.validate) return true;
    attrs = _.extend(Object.create(null), this.attributes, attrs);
    var error = this.validationError = this.validate(attrs, options) || null;
    if (!error) return true;
    this.trigger('invalid', this, error, _.extend(options, {validationError: error}));
    return false;
  }

});

if (_.keys) {
  // Underscore methods that we want to implement on the Model.
  var modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit'];

  // Mix in each Underscore method as a proxy to `Model#attributes`.
  modelMethods.filter(utilExists).forEach(function(method) {
    Model.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.attributes);
      return _[method].apply(_, args);
    };
  });
}
// Backbone.Collection
// -------------------

// If models tend to represent a single row of data, a Backbone Collection is
// more analagous to a table full of data ... or a small slice or page of that
// table, or a collection of rows that belong together for a particular reason
// -- all of the messages in this particular folder, all of the documents
// belonging to this particular author, and so on. Collections maintain
// indexes of their models, both in order, and for lookup by `id`.

// Create a new **Collection**, perhaps to contain a specific type of `model`.
// If a `comparator` is specified, the Collection will maintain
// its models in sort order, as they're added and removed.
var Collection = Backbone.Collection = function(models, options) {
  options || (options = {});
  if (options.model) this.model = options.model;
  if (options.comparator !== void 0) this.comparator = options.comparator;
  this._reset();
  this.initialize.apply(this, arguments);
  if (models) this.reset(models, _.extend({silent: true}, options));
};

// Default options for `Collection#set`.
var setOptions = {add: true, remove: true, merge: true};
var addOptions = {add: true, remove: false};

// Define the Collection's inheritable methods.
_.extend(Collection.prototype, Events, {

  // The default model for a collection is just a **Backbone.Model**.
  // This should be overridden in most cases.
  model: typeof Model === 'undefined' ? null : Model,

  // Initialize is an empty function by default. Override it with your own
  // initialization logic.
  initialize: function(){},

  // The JSON representation of a Collection is an array of the
  // models' attributes.
  toJSON: function(options) {
    return this.map(function(model){ return model.toJSON(options); });
  },

  // Proxy `Backbone.sync` by default.
  sync: function() {
    return Backbone.sync.apply(this, arguments);
  },

  // Add a model, or list of models to the set.
  add: function(models, options) {
    return this.set(models, _.extend({merge: false}, options, addOptions));
  },

  // Remove a model, or a list of models from the set.
  remove: function(models, options) {
    var singular = !Array.isArray(models);
    models = singular ? [models] : models.slice();
    options || (options = {});
    var i, l, index, model;
    for (i = 0, l = models.length; i < l; i++) {
      model = models[i] = this.get(models[i]);
      if (!model) continue;
      delete this._byId[model.id];
      delete this._byId[model.cid];
      index = this.indexOf(model);
      this.models.splice(index, 1);
      this.length--;
      if (!options.silent) {
        options.index = index;
        model.trigger('remove', model, this, options);
      }
      this._removeReference(model, options);
    }
    return singular ? models[0] : models;
  },

  // Update a collection by `set`-ing a new list of models, adding new ones,
  // removing models that are no longer present, and merging models that
  // already exist in the collection, as necessary. Similar to **Model#set**,
  // the core operation for updating the data contained by the collection.
  set: function(models, options) {
    options = _.defaults({}, options, setOptions);
    if (options.parse) models = this.parse(models, options);
    var singular = !Array.isArray(models);
    models = singular ? (models ? [models] : []) : models.slice();
    var i, l, id, model, attrs, existing, sort;
    var at = options.at;
    var targetModel = this.model;
    var sortable = this.comparator && (at == null) && options.sort !== false;
    var sortAttr = typeof this.comparator === 'string' ? this.comparator : null;
    var toAdd = [], toRemove = [], modelMap = {};
    var add = options.add, merge = options.merge, remove = options.remove;
    var order = !sortable && add && remove ? [] : false;

    // Turn bare objects into model references, and prevent invalid models
    // from being added.
    for (i = 0, l = models.length; i < l; i++) {
      attrs = models[i] || {};
      if (attrs instanceof Model) {
        id = model = attrs;
      } else {
        id = attrs[targetModel.prototype.idAttribute || 'id'];
      }

      // If a duplicate is found, prevent it from being added and
      // optionally merge it into the existing model.
      if (existing = this.get(id)) {
        if (remove) modelMap[existing.cid] = true;
        if (merge) {
          attrs = attrs === model ? model.attributes : attrs;
          if (options.parse) attrs = existing.parse(attrs, options);
          existing.set(attrs, options);
          if (sortable && !sort && existing.hasChanged(sortAttr)) sort = true;
        }
        models[i] = existing;

      // If this is a new, valid model, push it to the `toAdd` list.
      } else if (add) {
        model = models[i] = this._prepareModel(attrs, options);
        if (!model) continue;
        toAdd.push(model);
        this._addReference(model, options);
      }

      // Do not add multiple models with the same `id`.
      model = existing || model;
      if (order && (model.isNew() || !modelMap[model.id])) order.push(model);
      modelMap[model.id] = true;
    }

    // Remove nonexistent models if appropriate.
    if (remove) {
      for (i = 0, l = this.length; i < l; ++i) {
        if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
      }
      if (toRemove.length) this.remove(toRemove, options);
    }

    // See if sorting is needed, update `length` and splice in new models.
    if (toAdd.length || (order && order.length)) {
      if (sortable) sort = true;
      this.length += toAdd.length;
      if (at != null) {
        for (i = 0, l = toAdd.length; i < l; i++) {
          this.models.splice(at + i, 0, toAdd[i]);
        }
      } else {
        if (order) this.models.length = 0;
        var orderedModels = order || toAdd;
        for (i = 0, l = orderedModels.length; i < l; i++) {
          this.models.push(orderedModels[i]);
        }
      }
    }

    // Silently sort the collection if appropriate.
    if (sort) this.sort({silent: true});

    // Unless silenced, it's time to fire all appropriate add/sort events.
    if (!options.silent) {
      for (i = 0, l = toAdd.length; i < l; i++) {
        (model = toAdd[i]).trigger('add', model, this, options);
      }
      if (sort || (order && order.length)) this.trigger('sort', this, options);
    }

    // Return the added (or merged) model (or models).
    return singular ? models[0] : models;
  },

  // When you have more items than you want to add or remove individually,
  // you can reset the entire set with a new list of models, without firing
  // any granular `add` or `remove` events. Fires `reset` when finished.
  // Useful for bulk operations and optimizations.
  reset: function(models, options) {
    options || (options = {});
    for (var i = 0, l = this.models.length; i < l; i++) {
      this._removeReference(this.models[i], options);
    }
    options.previousModels = this.models;
    this._reset();
    models = this.add(models, _.extend({silent: true}, options));
    if (!options.silent) this.trigger('reset', this, options);
    return models;
  },

  // Add a model to the end of the collection.
  push: function(model, options) {
    return this.add(model, _.extend({at: this.length}, options));
  },

  // Remove a model from the end of the collection.
  pop: function(options) {
    var model = this.at(this.length - 1);
    this.remove(model, options);
    return model;
  },

  // Add a model to the beginning of the collection.
  unshift: function(model, options) {
    return this.add(model, _.extend({at: 0}, options));
  },

  // Remove a model from the beginning of the collection.
  shift: function(options) {
    var model = this.at(0);
    this.remove(model, options);
    return model;
  },

  // Slice out a sub-array of models from the collection.
  slice: function() {
    return slice.apply(this.models, arguments);
  },

  // Get a model from the set by id.
  get: function(obj) {
    if (obj == null) return void 0;
    return this._byId[obj] || this._byId[obj.id] || this._byId[obj.cid];
  },

  // Get the model at the given index.
  at: function(index) {
    return this.models[index];
  },

  // Return models with matching attributes. Useful for simple cases of
  // `filter`.
  where: function(attrs, first) {
    if (!attrs || !Object.keys(attrs).length) return first ? void 0 : [];
    return this[first ? 'find' : 'filter'](function(model) {
      for (var key in attrs) {
        if (attrs[key] !== model.get(key)) return false;
      }
      return true;
    });
  },

  // Return the first model with matching attributes. Useful for simple cases
  // of `find`.
  findWhere: function(attrs) {
    return this.where(attrs, true);
  },

  // Force the collection to re-sort itself. You don't need to call this under
  // normal circumstances, as the set will maintain sort order as each item
  // is added.
  sort: function(options) {
    if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
    options || (options = {});

    // Run sort based on type of `comparator`.
    if (typeof this.comparator === 'string' || this.comparator.length === 1) {
      this.models = this.sortBy(this.comparator, this);
    } else {
      this.models.sort(this.comparator.bind(this));
    }

    if (!options.silent) this.trigger('sort', this, options);
    return this;
  },

  // Pluck an attribute from each model in the collection.
  pluck: function(attr) {
    return this.models.map(function(model) {
      return model.get(attr);
    });
  },

  // Fetch the default set of models for this collection, resetting the
  // collection when they arrive. If `reset: true` is passed, the response
  // data will be passed through the `reset` method instead of `set`.
  fetch: function(options) {
    options = options ? _.extend({}, options) : {};
    if (options.parse === void 0) options.parse = true;
    var success = options.success;
    var collection = this;
    options.success = function(resp) {
      var method = options.reset ? 'reset' : 'set';
      collection[method](resp, options);
      if (success) success(collection, resp, options);
      collection.trigger('sync', collection, resp, options);
    };
    wrapError(this, options);
    return this.sync('read', this, options);
  },

  // Create a new instance of a model in this collection. Add the model to the
  // collection immediately, unless `wait: true` is passed, in which case we
  // wait for the server to agree.
  create: function(model, options) {
    options = options ? _.extend({}, options) : {};
    if (!(model = this._prepareModel(model, options))) return false;
    if (!options.wait) this.add(model, options);
    var collection = this;
    var success = options.success;
    options.success = function(model, resp) {
      if (options.wait) collection.add(model, options);
      if (success) success(model, resp, options);
    };
    model.save(null, options);
    return model;
  },

  // **parse** converts a response into a list of models to be added to the
  // collection. The default implementation is just to pass it through.
  parse: function(resp, options) {
    return resp;
  },

  // Create a new collection with an identical list of models as this one.
  clone: function() {
    return new this.constructor(this.models);
  },

  // Private method to reset all internal state. Called when the collection
  // is first initialized or reset.
  _reset: function() {
    this.length = 0;
    this.models = [];
    this._byId  = Object.create(null);
  },

  // Prepare a hash of attributes (or other model) to be added to this
  // collection.
  _prepareModel: function(attrs, options) {
    if (attrs instanceof Model) return attrs;
    options = _.extend({}, options);
    options.collection = this;
    var model = new this.model(attrs, options);
    if (!model.validationError) return model;
    this.trigger('invalid', this, model.validationError, options);
    return false;
  },

  // Internal method to create a model's ties to a collection.
  _addReference: function(model, options) {
    this._byId[model.cid] = model;
    if (model.id != null) this._byId[model.id] = model;
    if (!model.collection) model.collection = this;
    model.on('all', this._onModelEvent, this);
  },

  // Internal method to sever a model's ties to a collection.
  _removeReference: function(model, options) {
    if (this === model.collection) delete model.collection;
    model.off('all', this._onModelEvent, this);
  },

  // Internal method called every time a model in the set fires an event.
  // Sets need to update their indexes when models change ids. All other
  // events simply proxy through. "add" and "remove" events that originate
  // in other collections are ignored.
  _onModelEvent: function(event, model, collection, options) {
    if ((event === 'add' || event === 'remove') && collection !== this) return;
    if (event === 'destroy') this.remove(model, options);
    if (model && event === 'change:' + model.idAttribute) {
      delete this._byId[model.previous(model.idAttribute)];
      if (model.id != null) this._byId[model.id] = model;
    }
    this.trigger.apply(this, arguments);
  }

});

if (utilExists('each')) {
  // Underscore methods that we want to implement on the Collection.
  // 90% of the core usefulness of Backbone Collections is actually implemented
  // right here:
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'difference', 'indexOf', 'shuffle',
    'lastIndexOf', 'isEmpty', 'chain'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  methods.filter(utilExists).forEach(function(method) {
    Collection.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.models);
      return _[method].apply(_, args);
    };
  });

  // Underscore methods that take a property name as an argument.
  var attributeMethods = ['groupBy', 'countBy', 'sortBy'];

  // Use attributes instead of properties.
  attributeMethods.filter(utilExists).forEach(function(method) {
    Collection.prototype[method] = function(value, context) {
      var iterator = typeof value === 'function' ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });
} else {
  ['forEach', 'map', 'filter', 'some', 'every', 'reduce', 'reduceRight',
    'indexOf', 'lastIndexOf'].forEach(function(method) {
    Collection.prototype[method] = function(arg, context) {
      return this.models[method](arg, context);
    };
  });

  // Exoskeleton-specific:
  Collection.prototype.find = function(iterator, context) {
    var result;
    this.some(function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Underscore methods that take a property name as an argument.
  ['sortBy'].forEach(function(method) {
    Collection.prototype[method] = function(value, context) {
      var iterator = typeof value === 'function' ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });
}
// Backbone.View
// -------------

// Backbone Views are almost more convention than they are actual code. A View
// is simply a JavaScript object that represents a logical chunk of UI in the
// DOM. This might be a single item, an entire list, a sidebar or panel, or
// even the surrounding frame which wraps your whole app. Defining a chunk of
// UI as a **View** allows you to define your DOM events declaratively, without
// having to worry about render order ... and makes it easy for the view to
// react to specific changes in the state of your models.

// Creating a Backbone.View creates its initial element outside of the DOM,
// if an existing element is not provided...
var View = Backbone.View = function(options) {
  this.cid = _.uniqueId('view');

  if (options) Object.keys(options).forEach(function(key) {
    if (viewOptions.indexOf(key) !== -1) this[key] = options[key];
  }, this);

  this._ensureElement();
  this.initialize.apply(this, arguments);
};

// Cached regex to split keys for `delegate`.
var delegateEventSplitter = /^(\S+)\s*(.*)$/;

// List of view options to be merged as properties.
var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

// Set up all inheritable **Backbone.View** properties and methods.
_.extend(View.prototype, Events, {

  // The default `tagName` of a View's element is `"div"`.
  tagName: 'div',

  // jQuery delegate for element lookup, scoped to DOM elements within the
  // current view. This should be preferred to global lookups where possible.
  $: function(selector) {
    return this.$el.find(selector);
  },

  // Initialize is an empty function by default. Override it with your own
  // initialization logic.
  initialize: function(){},

  // **render** is the core function that your view should override, in order
  // to populate its element (`this.el`), with the appropriate HTML. The
  // convention is for **render** to always return `this`.
  render: function() {
    return this;
  },

  // Remove this view by taking the element out of the DOM, and removing any
  // applicable Backbone.Events listeners.
  remove: function() {
    this._removeElement();
    this.stopListening();
    return this;
  },

  // Remove this view's element from the document and all event listeners
  // attached to it. Exposed for subclasses using an alternative DOM
  // manipulation API.
  _removeElement: function() {
    this.$el.remove();
  },

  // Change the view's element (`this.el` property) and re-delegate the
  // view's events on the new element.
  setElement: function(element) {
    this.undelegateEvents();
    this._setElement(element);
    this.delegateEvents();
    return this;
  },

  // Creates the `this.el` and `this.$el` references for this view using the
  // given `el` and a hash of `attributes`. `el` can be a CSS selector or an
  // HTML string, a jQuery context or an element. Subclasses can override
  // this to utilize an alternative DOM manipulation API and are only required
  // to set the `this.el` property.
  _setElement: function(el) {
    this.$el = el instanceof Backbone.$ ? el : Backbone.$(el);
    this.el = this.$el[0];
  },

  // Set callbacks, where `this.events` is a hash of
  //
  // *{"event selector": "callback"}*
  //
  //     {
  //       'mousedown .title':  'edit',
  //       'click .button':     'save',
  //       'click .open':       function(e) { ... }
  //     }
  //
  // pairs. Callbacks will be bound to the view, with `this` set properly.
  // Uses event delegation for efficiency.
  // Omitting the selector binds the event to `this.el`.
  delegateEvents: function(events) {
    if (!(events || (events = _.result(this, 'events')))) return this;
    this.undelegateEvents();
    for (var key in events) {
      var method = events[key];
      if (typeof method !== 'function') method = this[events[key]];
      // if (!method) continue;
      var match = key.match(delegateEventSplitter);
      this.delegate(match[1], match[2], method.bind(this));
    }
    return this;
  },

  // Add a single event listener to the view's element (or a child element
  // using `selector`). This only works for delegate-able events: not `focus`,
  // `blur`, and not `change`, `submit`, and `reset` in Internet Explorer.
  delegate: function(eventName, selector, listener) {
    this.$el.on(eventName + '.delegateEvents' + this.cid, selector, listener);
  },

  // Clears all callbacks previously bound to the view by `delegateEvents`.
  // You usually don't need to use this, but may wish to if you have multiple
  // Backbone views attached to the same DOM element.
  undelegateEvents: function() {
    if (this.$el) this.$el.off('.delegateEvents' + this.cid);
    return this;
  },

  // A finer-grained `undelegateEvents` for removing a single delegated event.
  // `selector` and `listener` are both optional.
  undelegate: function(eventName, selector, listener) {
    this.$el.off(eventName + '.delegateEvents' + this.cid, selector, listener);
  },

  // Produces a DOM element to be assigned to your view. Exposed for
  // subclasses using an alternative DOM manipulation API.
  _createElement: function(tagName) {
    return document.createElement(tagName);
  },

  // Ensure that the View has a DOM element to render into.
  // If `this.el` is a string, pass it through `$()`, take the first
  // matching element, and re-assign it to `el`. Otherwise, create
  // an element from the `id`, `className` and `tagName` properties.
  _ensureElement: function() {
    if (!this.el) {
      var attrs = _.extend({}, _.result(this, 'attributes'));
      if (this.id) attrs.id = _.result(this, 'id');
      if (this.className) attrs['class'] = _.result(this, 'className');
      this.setElement(this._createElement(_.result(this, 'tagName')));
      this._setAttributes(attrs);
    } else {
      this.setElement(_.result(this, 'el'));
    }
  },

  // Set attributes from a hash on this view's element.  Exposed for
  // subclasses using an alternative DOM manipulation API.
  _setAttributes: function(attributes) {
    this.$el.attr(attributes);
  }

});
// Backbone.sync
// -------------

// Override this function to change the manner in which Backbone persists
// models to the server. You will be passed the type of request, and the
// model in question. By default, makes a RESTful Ajax request
// to the model's `url()`. Some possible customizations could be:
//
// * Use `setTimeout` to batch rapid-fire updates into a single request.
// * Send up the models as XML instead of JSON.
// * Persist models via WebSockets instead of Ajax.
Backbone.sync = function(method, model, options) {
  options || (options = {})

  var type = methodMap[method];

  // Default JSON-request options.
  var params = {type: type, dataType: 'json'};

  // Ensure that we have a URL.
  if (!options.url) {
    params.url = _.result(model, 'url') || urlError();
  }

  // Ensure that we have the appropriate request data.
  if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
    params.contentType = 'application/json';
    params.data = JSON.stringify(options.attrs || model.toJSON(options));
  }

  // Don't process data on a non-GET request.
  if (params.type !== 'GET') {
    params.processData = false;
  }

  // Make the request, allowing the user to override any Ajax options.
  var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
  model.trigger('request', model, xhr, options);
  return xhr;
};

// Map from CRUD to HTTP for our default `Backbone.sync` implementation.
var methodMap = {
  'create': 'POST',
  'update': 'PUT',
  'patch':  'PATCH',
  'delete': 'DELETE',
  'read':   'GET'
};

// Set the default implementation of `Backbone.ajax` to proxy through to `$`.
// Override this if you'd like to use a different library.
Backbone.ajax = function() {
  return Backbone.$.ajax.apply(Backbone.$, arguments);
};
// Backbone.Router
// ---------------

// Routers map faux-URLs to actions, and fire events when routes are
// matched. Creating a new one sets its `routes` hash, if not set statically.
var Router = Backbone.Router = function(options) {
  options || (options = {});
  if (options.routes) this.routes = options.routes;
  this._bindRoutes();
  this.initialize.apply(this, arguments);
};

// Cached regular expressions for matching named param parts and splatted
// parts of route strings.
var optionalParam = /\((.*?)\)/g;
var namedParam    = /(\(\?)?:\w+/g;
var splatParam    = /\*\w+/g;
var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

var isRegExp = function(value) {
  return value ? (typeof value === 'object' && toString.call(value) === '[object RegExp]') : false;
};

// Set up all inheritable **Backbone.Router** properties and methods.
_.extend(Router.prototype, Events, {

  // Initialize is an empty function by default. Override it with your own
  // initialization logic.
  initialize: function(){},

  // Manually bind a single named route to a callback. For example:
  //
  //     this.route('search/:query/p:num', 'search', function(query, num) {
  //       ...
  //     });
  //
  route: function(route, name, callback) {
    if (!isRegExp(route)) route = this._routeToRegExp(route);
    if (typeof name === 'function') {
      callback = name;
      name = '';
    }
    if (!callback) callback = this[name];
    var router = this;
    Backbone.history.route(route, function(fragment) {
      var args = router._extractParameters(route, fragment);
      router.execute(callback, args);
      router.trigger.apply(router, ['route:' + name].concat(args));
      router.trigger('route', name, args);
      Backbone.history.trigger('route', router, name, args);
    });
    return this;
  },

  // Execute a route handler with the provided parameters.  This is an
  // excellent place to do pre-route setup or post-route cleanup.
  execute: function(callback, args) {
    if (callback) callback.apply(this, args);
  },

  // Simple proxy to `Backbone.history` to save a fragment into the history.
  navigate: function(fragment, options) {
    Backbone.history.navigate(fragment, options);
    return this;
  },

  // Bind all defined routes to `Backbone.history`. We have to reverse the
  // order of the routes here to support behavior where the most general
  // routes can be defined at the bottom of the route map.
  _bindRoutes: function() {
    if (!this.routes) return;
    this.routes = _.result(this, 'routes');
    var route, routes = Object.keys(this.routes);
    while ((route = routes.pop()) != null) {
      this.route(route, this.routes[route]);
    }
  },

  // Convert a route string into a regular expression, suitable for matching
  // against the current location hash.
  _routeToRegExp: function(route) {
    route = route.replace(escapeRegExp, '\\$&')
                 .replace(optionalParam, '(?:$1)?')
                 .replace(namedParam, function(match, optional) {
                   return optional ? match : '([^/?]+)';
                 })
                 .replace(splatParam, '([^?]*?)');
    return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
  },

  // Given a route, and a URL fragment that it matches, return the array of
  // extracted decoded parameters. Empty or unmatched parameters will be
  // treated as `null` to normalize cross-browser behavior.
  _extractParameters: function(route, fragment) {
    var params = route.exec(fragment).slice(1);
    return params.map(function(param, i) {
      // Don't decode the search params.
      if (i === params.length - 1) return param || null;
      return param ? decodeURIComponent(param) : null;
    });
  }

});
// Backbone.History
// ----------------

// Handles cross-browser history management, based on either
// [pushState](http://diveintohtml5.info/history.html) and real URLs, or
// [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
// and URL fragments.
var History = Backbone.History = function() {
  this.handlers = [];
  this.checkUrl = this.checkUrl.bind(this);

  // Ensure that `History` can be used outside of the browser.
  if (typeof window !== 'undefined') {
    this.location = window.location;
    this.history = window.history;
  }
};

// Cached regex for stripping a leading hash/slash and trailing space.
var routeStripper = /^[#\/]|\s+$/g;

// Cached regex for stripping leading and trailing slashes.
var rootStripper = /^\/+|\/+$/g;

// Cached regex for removing a trailing slash.
var trailingSlash = /\/$/;

// Cached regex for stripping urls of hash and query.
var pathStripper = /[#].*$/;

// Has the history handling already been started?
History.started = false;

// Set up all inheritable **Backbone.History** properties and methods.
_.extend(History.prototype, Events, {

  // Are we at the app root?
  atRoot: function() {
    return this.location.pathname.replace(/[^\/]$/, '$&/') === this.root;
  },

  // Gets the true hash value. Cannot use location.hash directly due to bug
  // in Firefox where location.hash will always be decoded.
  getHash: function(window) {
    var match = (window || this).location.href.match(/#(.*)$/);
    return match ? match[1] : '';
  },

  // Get the cross-browser normalized URL fragment, either from the URL,
  // the hash, or the override.
  getFragment: function(fragment, forcePushState) {
    if (fragment == null) {
      if (this._wantsPushState || !this._wantsHashChange) {
        fragment = decodeURI(this.location.pathname + this.location.search);
        var root = this.root.replace(trailingSlash, '');
        if (!fragment.indexOf(root)) fragment = fragment.slice(root.length);
      } else {
        fragment = this.getHash();
      }
    }
    return fragment.replace(routeStripper, '');
  },

  // Start the hash change handling, returning `true` if the current URL matches
  // an existing route, and `false` otherwise.
  start: function(options) {
    if (History.started) throw new Error("Backbone.history has already been started");
    History.started = true;

    // Figure out the initial configuration.
    // Is pushState desired or should we use hashchange only?
    this.options          = _.extend({root: '/'}, this.options, options);
    this.root             = this.options.root;
    this._wantsHashChange = this.options.hashChange !== false;
    this._wantsPushState  = !!this.options.pushState;
    var fragment          = this.getFragment();

    // Normalize root to always include a leading and trailing slash.
    this.root = ('/' + this.root + '/').replace(rootStripper, '/');

    // Depending on whether we're using pushState or hashes, determine how we
    // check the URL state.
    if (this._wantsPushState) {
      window.addEventListener('popstate', this.checkUrl, false);
    } else if (this._wantsHashChange) {
      window.addEventListener('hashchange', this.checkUrl, false);
    }

    // Determine if we need to change the base url, for a pushState link
    // opened by a non-pushState browser.
    this.fragment = fragment;
    var loc = this.location;

    // Transition from hashChange to pushState or vice versa if both are
    // requested.
    if (this._wantsHashChange && this._wantsPushState) {

      // If we've started out with a hash-based route, but we're currently
      // in a browser where it could be `pushState`-based instead...
      if (this.atRoot() && loc.hash) {
        this.fragment = this.getHash().replace(routeStripper, '');
        this.history.replaceState({}, document.title, this.root + this.fragment);
      }

    }

    if (!this.options.silent) return this.loadUrl();
  },

  // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
  // but possibly useful for unit testing Routers.
  stop: function() {
    window.removeEventListener('popstate', this.checkUrl);
    window.removeEventListener('hashchange', this.checkUrl);
    History.started = false;
  },

  // Add a route to be tested when the fragment changes. Routes added later
  // may override previous routes.
  route: function(route, callback) {
    this.handlers.unshift({route: route, callback: callback});
  },

  // Checks the current URL to see if it has changed, and if it has,
  // calls `loadUrl`.
  checkUrl: function() {
    var current = this.getFragment();
    if (current === this.fragment) return false;
    this.loadUrl();
  },

  // Attempt to load the current URL fragment. If a route succeeds with a
  // match, returns `true`. If no defined routes matches the fragment,
  // returns `false`.
  loadUrl: function(fragment) {
    fragment = this.fragment = this.getFragment(fragment);
    return this.handlers.some(function(handler) {
      if (handler.route.test(fragment)) {
        handler.callback(fragment);
        return true;
      }
    });
  },

  // Save a fragment into the hash history, or replace the URL state if the
  // 'replace' option is passed. You are responsible for properly URL-encoding
  // the fragment in advance.
  //
  // The options object can contain `trigger: true` if you wish to have the
  // route callback be fired (not usually desirable), or `replace: true`, if
  // you wish to modify the current URL without adding an entry to the history.
  navigate: function(fragment, options) {
    if (!History.started) return false;
    if (!options || options === true) options = {trigger: !!options};

    var url = this.root + (fragment = this.getFragment(fragment || ''));

    // Strip the hash for matching.
    fragment = fragment.replace(pathStripper, '');

    if (this.fragment === fragment) return;
    this.fragment = fragment;

    // Don't include a trailing slash on the root.
    if (fragment === '' && url !== '/') url = url.slice(0, -1);

    // If we're using pushState we use it to set the fragment as a real URL.
    if (this._wantsPushState) {
      this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

    // If hash changes haven't been explicitly disabled, update the hash
    // fragment to store history.
    } else if (this._wantsHashChange) {
      this._updateHash(this.location, fragment, options.replace);
    // If you've told us that you explicitly don't want fallback hashchange-
    // based history, then `navigate` becomes a page refresh.
    } else {
      return this.location.assign(url);
    }
    if (options.trigger) return this.loadUrl(fragment);
  },

  // Update the hash location, either replacing the current entry, or adding
  // a new one to the browser history.
  _updateHash: function(location, fragment, replace) {
    if (replace) {
      var href = location.href.replace(/(javascript:|#).*$/, '');
      location.replace(href + '#' + fragment);
    } else {
      // Some browsers require that `hash` contains a leading #.
      location.hash = '#' + fragment;
    }
  }

});
  // !!!
  // Init.
  ['Model', 'Collection', 'Router', 'View', 'History'].forEach(function(name) {
    var item = Backbone[name];
    if (item) item.extend = Backbone.extend;
  });

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(Backbone, Events);

  // Create the default Backbone.history if the History module is included.
  if (History) Backbone.history = new History();
  return Backbone;
});

},{"jquery":3,"underscore":3}],5:[function(require,module,exports){
"use strict";
/*globals Handlebars: true */
var base = require("./handlebars/base");

// Each of these augment the Handlebars object. No need to setup here.
// (This is done to easily share code between commonjs and browse envs)
var SafeString = require("./handlebars/safe-string")["default"];
var Exception = require("./handlebars/exception")["default"];
var Utils = require("./handlebars/utils");
var runtime = require("./handlebars/runtime");

// For compatibility and usage outside of module systems, make the Handlebars object a namespace
var create = function() {
  var hb = new base.HandlebarsEnvironment();

  Utils.extend(hb, base);
  hb.SafeString = SafeString;
  hb.Exception = Exception;
  hb.Utils = Utils;

  hb.VM = runtime;
  hb.template = function(spec) {
    return runtime.template(spec, hb);
  };

  return hb;
};

var Handlebars = create();
Handlebars.create = create;

exports["default"] = Handlebars;
},{"./handlebars/base":6,"./handlebars/exception":7,"./handlebars/runtime":8,"./handlebars/safe-string":9,"./handlebars/utils":10}],6:[function(require,module,exports){
"use strict";
var Utils = require("./utils");
var Exception = require("./exception")["default"];

var VERSION = "1.3.0";
exports.VERSION = VERSION;var COMPILER_REVISION = 4;
exports.COMPILER_REVISION = COMPILER_REVISION;
var REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '>= 1.0.0'
};
exports.REVISION_CHANGES = REVISION_CHANGES;
var isArray = Utils.isArray,
    isFunction = Utils.isFunction,
    toString = Utils.toString,
    objectType = '[object Object]';

function HandlebarsEnvironment(helpers, partials) {
  this.helpers = helpers || {};
  this.partials = partials || {};

  registerDefaultHelpers(this);
}

exports.HandlebarsEnvironment = HandlebarsEnvironment;HandlebarsEnvironment.prototype = {
  constructor: HandlebarsEnvironment,

  logger: logger,
  log: log,

  registerHelper: function(name, fn, inverse) {
    if (toString.call(name) === objectType) {
      if (inverse || fn) { throw new Exception('Arg not supported with multiple helpers'); }
      Utils.extend(this.helpers, name);
    } else {
      if (inverse) { fn.not = inverse; }
      this.helpers[name] = fn;
    }
  },

  registerPartial: function(name, str) {
    if (toString.call(name) === objectType) {
      Utils.extend(this.partials,  name);
    } else {
      this.partials[name] = str;
    }
  }
};

function registerDefaultHelpers(instance) {
  instance.registerHelper('helperMissing', function(arg) {
    if(arguments.length === 2) {
      return undefined;
    } else {
      throw new Exception("Missing helper: '" + arg + "'");
    }
  });

  instance.registerHelper('blockHelperMissing', function(context, options) {
    var inverse = options.inverse || function() {}, fn = options.fn;

    if (isFunction(context)) { context = context.call(this); }

    if(context === true) {
      return fn(this);
    } else if(context === false || context == null) {
      return inverse(this);
    } else if (isArray(context)) {
      if(context.length > 0) {
        return instance.helpers.each(context, options);
      } else {
        return inverse(this);
      }
    } else {
      return fn(context);
    }
  });

  instance.registerHelper('each', function(context, options) {
    var fn = options.fn, inverse = options.inverse;
    var i = 0, ret = "", data;

    if (isFunction(context)) { context = context.call(this); }

    if (options.data) {
      data = createFrame(options.data);
    }

    if(context && typeof context === 'object') {
      if (isArray(context)) {
        for(var j = context.length; i<j; i++) {
          if (data) {
            data.index = i;
            data.first = (i === 0);
            data.last  = (i === (context.length-1));
          }
          ret = ret + fn(context[i], { data: data });
        }
      } else {
        for(var key in context) {
          if(context.hasOwnProperty(key)) {
            if(data) { 
              data.key = key; 
              data.index = i;
              data.first = (i === 0);
            }
            ret = ret + fn(context[key], {data: data});
            i++;
          }
        }
      }
    }

    if(i === 0){
      ret = inverse(this);
    }

    return ret;
  });

  instance.registerHelper('if', function(conditional, options) {
    if (isFunction(conditional)) { conditional = conditional.call(this); }

    // Default behavior is to render the positive path if the value is truthy and not empty.
    // The `includeZero` option may be set to treat the condtional as purely not empty based on the
    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
    if ((!options.hash.includeZero && !conditional) || Utils.isEmpty(conditional)) {
      return options.inverse(this);
    } else {
      return options.fn(this);
    }
  });

  instance.registerHelper('unless', function(conditional, options) {
    return instance.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn, hash: options.hash});
  });

  instance.registerHelper('with', function(context, options) {
    if (isFunction(context)) { context = context.call(this); }

    if (!Utils.isEmpty(context)) return options.fn(context);
  });

  instance.registerHelper('log', function(context, options) {
    var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
    instance.log(level, context);
  });
}

var logger = {
  methodMap: { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' },

  // State enum
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  level: 3,

  // can be overridden in the host environment
  log: function(level, obj) {
    if (logger.level <= level) {
      var method = logger.methodMap[level];
      if (typeof console !== 'undefined' && console[method]) {
        console[method].call(console, obj);
      }
    }
  }
};
exports.logger = logger;
function log(level, obj) { logger.log(level, obj); }

exports.log = log;var createFrame = function(object) {
  var obj = {};
  Utils.extend(obj, object);
  return obj;
};
exports.createFrame = createFrame;
},{"./exception":7,"./utils":10}],7:[function(require,module,exports){
"use strict";

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

function Exception(message, node) {
  var line;
  if (node && node.firstLine) {
    line = node.firstLine;

    message += ' - ' + line + ':' + node.firstColumn;
  }

  var tmp = Error.prototype.constructor.call(this, message);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }

  if (line) {
    this.lineNumber = line;
    this.column = node.firstColumn;
  }
}

Exception.prototype = new Error();

exports["default"] = Exception;
},{}],8:[function(require,module,exports){
"use strict";
var Utils = require("./utils");
var Exception = require("./exception")["default"];
var COMPILER_REVISION = require("./base").COMPILER_REVISION;
var REVISION_CHANGES = require("./base").REVISION_CHANGES;

function checkRevision(compilerInfo) {
  var compilerRevision = compilerInfo && compilerInfo[0] || 1,
      currentRevision = COMPILER_REVISION;

  if (compilerRevision !== currentRevision) {
    if (compilerRevision < currentRevision) {
      var runtimeVersions = REVISION_CHANGES[currentRevision],
          compilerVersions = REVISION_CHANGES[compilerRevision];
      throw new Exception("Template was precompiled with an older version of Handlebars than the current runtime. "+
            "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").");
    } else {
      // Use the embedded version info since the runtime doesn't know about this revision yet
      throw new Exception("Template was precompiled with a newer version of Handlebars than the current runtime. "+
            "Please update your runtime to a newer version ("+compilerInfo[1]+").");
    }
  }
}

exports.checkRevision = checkRevision;// TODO: Remove this line and break up compilePartial

function template(templateSpec, env) {
  if (!env) {
    throw new Exception("No environment passed to template");
  }

  // Note: Using env.VM references rather than local var references throughout this section to allow
  // for external users to override these as psuedo-supported APIs.
  var invokePartialWrapper = function(partial, name, context, helpers, partials, data) {
    var result = env.VM.invokePartial.apply(this, arguments);
    if (result != null) { return result; }

    if (env.compile) {
      var options = { helpers: helpers, partials: partials, data: data };
      partials[name] = env.compile(partial, { data: data !== undefined }, env);
      return partials[name](context, options);
    } else {
      throw new Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
    }
  };

  // Just add water
  var container = {
    escapeExpression: Utils.escapeExpression,
    invokePartial: invokePartialWrapper,
    programs: [],
    program: function(i, fn, data) {
      var programWrapper = this.programs[i];
      if(data) {
        programWrapper = program(i, fn, data);
      } else if (!programWrapper) {
        programWrapper = this.programs[i] = program(i, fn);
      }
      return programWrapper;
    },
    merge: function(param, common) {
      var ret = param || common;

      if (param && common && (param !== common)) {
        ret = {};
        Utils.extend(ret, common);
        Utils.extend(ret, param);
      }
      return ret;
    },
    programWithDepth: env.VM.programWithDepth,
    noop: env.VM.noop,
    compilerInfo: null
  };

  return function(context, options) {
    options = options || {};
    var namespace = options.partial ? options : env,
        helpers,
        partials;

    if (!options.partial) {
      helpers = options.helpers;
      partials = options.partials;
    }
    var result = templateSpec.call(
          container,
          namespace, context,
          helpers,
          partials,
          options.data);

    if (!options.partial) {
      env.VM.checkRevision(container.compilerInfo);
    }

    return result;
  };
}

exports.template = template;function programWithDepth(i, fn, data /*, $depth */) {
  var args = Array.prototype.slice.call(arguments, 3);

  var prog = function(context, options) {
    options = options || {};

    return fn.apply(this, [context, options.data || data].concat(args));
  };
  prog.program = i;
  prog.depth = args.length;
  return prog;
}

exports.programWithDepth = programWithDepth;function program(i, fn, data) {
  var prog = function(context, options) {
    options = options || {};

    return fn(context, options.data || data);
  };
  prog.program = i;
  prog.depth = 0;
  return prog;
}

exports.program = program;function invokePartial(partial, name, context, helpers, partials, data) {
  var options = { partial: true, helpers: helpers, partials: partials, data: data };

  if(partial === undefined) {
    throw new Exception("The partial " + name + " could not be found");
  } else if(partial instanceof Function) {
    return partial(context, options);
  }
}

exports.invokePartial = invokePartial;function noop() { return ""; }

exports.noop = noop;
},{"./base":6,"./exception":7,"./utils":10}],9:[function(require,module,exports){
"use strict";
// Build out our basic SafeString type
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = function() {
  return "" + this.string;
};

exports["default"] = SafeString;
},{}],10:[function(require,module,exports){
"use strict";
/*jshint -W004 */
var SafeString = require("./safe-string")["default"];

var escape = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "`": "&#x60;"
};

var badChars = /[&<>"'`]/g;
var possible = /[&<>"'`]/;

function escapeChar(chr) {
  return escape[chr] || "&amp;";
}

function extend(obj, value) {
  for(var key in value) {
    if(Object.prototype.hasOwnProperty.call(value, key)) {
      obj[key] = value[key];
    }
  }
}

exports.extend = extend;var toString = Object.prototype.toString;
exports.toString = toString;
// Sourced from lodash
// https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
var isFunction = function(value) {
  return typeof value === 'function';
};
// fallback for older versions of Chrome and Safari
if (isFunction(/x/)) {
  isFunction = function(value) {
    return typeof value === 'function' && toString.call(value) === '[object Function]';
  };
}
var isFunction;
exports.isFunction = isFunction;
var isArray = Array.isArray || function(value) {
  return (value && typeof value === 'object') ? toString.call(value) === '[object Array]' : false;
};
exports.isArray = isArray;

function escapeExpression(string) {
  // don't escape SafeStrings, since they're already safe
  if (string instanceof SafeString) {
    return string.toString();
  } else if (!string && string !== 0) {
    return "";
  }

  // Force a string conversion as this will be done by the append regardless and
  // the regex test will do this transparently behind the scenes, causing issues if
  // an object's to string has escaped characters in it.
  string = "" + string;

  if(!possible.test(string)) { return string; }
  return string.replace(badChars, escapeChar);
}

exports.escapeExpression = escapeExpression;function isEmpty(value) {
  if (!value && value !== 0) {
    return true;
  } else if (isArray(value) && value.length === 0) {
    return true;
  } else {
    return false;
  }
}

exports.isEmpty = isEmpty;
},{"./safe-string":9}],11:[function(require,module,exports){
// Create a simple path alias to allow browserify to resolve
// the runtime on a supported path.
module.exports = require('./dist/cjs/handlebars.runtime');

},{"./dist/cjs/handlebars.runtime":5}],12:[function(require,module,exports){
module.exports = require("handlebars/runtime")["default"];

},{"handlebars/runtime":11}],13:[function(require,module,exports){
require("backbone.nativeajax");
var Exoskeleton = require("exoskeleton");

var BaseCollection = Exoskeleton.Collection.extend({

});

module.exports = BaseCollection;
},{"backbone.nativeajax":1,"exoskeleton":4}],14:[function(require,module,exports){
require("backbone.nativeajax");
var Exoskeleton = require("exoskeleton");

var BaseModel = Exoskeleton.Model.extend({

});

module.exports = BaseModel;
},{"backbone.nativeajax":1,"exoskeleton":4}],15:[function(require,module,exports){
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

    this.el.innerHTML = template(data);
  }

});

module.exports = BaseView;
},{"backbone.nativeview":2,"exoskeleton":4}],16:[function(require,module,exports){
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
      arr.push(getRandomArbitrary(0, 2));
    }
    return arr;
  }
});

module.exports = CardModel;
},{"../base/model":14}],17:[function(require,module,exports){
var BaseCollection = require("../base/collection");
var CardModel = require("./card");

var CardCollection = BaseCollection.extend({

  model: CardModel,

  url: "rest/kort",

  comparator: "title"

});

module.exports = CardCollection;
},{"../base/collection":13,"./card":16}],18:[function(require,module,exports){
var BaseView = require("../base/view");
var template = require("./template.hb");

var CardDetailsView = BaseView.extend({

  className: "detail",
  tagName: "article",

  template: template,

  initialize: function() {
    this.listenTo(this.model, "request", this.renderLoading);
    this.listenTo(this.model, "sync", this.render);
  },

  render: function() {
    var data = this.model.toJSON();
    data.colorid = this.model.getColorId();
    this.renderTemplate(data);
  }

});


module.exports = CardDetailsView;
},{"../base/view":15,"./template.hb":19}],19:[function(require,module,exports){
// hbsfy compiled Handlebars template
var Handlebars = require('hbsfy/runtime');
module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n<figure class=\"colorid-";
  if (helper = helpers.colorid) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.colorid); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.figureBackgroundColor), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += ">\n  <div class=\"container\">\n    <img src=\"";
  if (helper = helpers.figure) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.figure); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" alt=\"Katt\"/>\n  </div>\n</figure>\n";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "style=\"background-color:";
  if (helper = helpers.figureBackgroundColor) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.figureBackgroundColor); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"";
  return buffer;
  }

function program4(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  <section>\n    <h2>Referanser og ressurser</h2>\n    <ul>\n      ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.reference), {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </ul>\n  </section>\n  ";
  return buffer;
  }
function program5(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n        <li>\n          <a href=\"";
  if (helper = helpers.url) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.url); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n            ";
  if (helper = helpers.title) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.title); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n          </a>\n        </li>\n      ";
  return buffer;
  }

function program7(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  <section>\n    <h2>\n      Relevante og beslektede temaer\n    </h2>\n\n    <ul>\n    ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.relevant), {hash:{},inverse:self.noop,fn:self.program(8, program8, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </ul>\n\n  </section>\n  ";
  return buffer;
  }
function program8(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n      <li>\n        <a href=\"";
  if (helper = helpers.url) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.url); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n          ";
  if (helper = helpers.title) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.title); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n        </a>\n      </li>\n    ";
  return buffer;
  }

  buffer += "<header>\n  <div class=\"container\">\n    <h1 class=\"decorated\">";
  if (helper = helpers.title) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.title); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</h1>\n    <p class=\"lead\">";
  if (helper = helpers.preface) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.preface); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</p>\n  </div>\n</header>\n\n";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.figure), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n\n<div class=\"article-body\">\n  <div class=\"container\">\n    ";
  if (helper = helpers.body) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.body); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  </div>\n</div>\n\n<aside>\n  <div class=\"container\">\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.reference), {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.relevant), {hash:{},inverse:self.noop,fn:self.program(7, program7, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  </div>\n</aside>\n";
  return buffer;
  });

},{"hbsfy/runtime":12}],20:[function(require,module,exports){
var BaseView = require("../base/view");
var template = require("./template.hb");

var CardListView = BaseView.extend({

  template: template,

  className: "card-list-wrapper",

  initialize: function() {
    this.listenTo(this.collection, "request", this.renderLoading);
    this.listenTo(this.collection, "sync", this.render);
  },

   render: function() {
    var data = this.collection.map(function(model) {
      var attrs = model.toJSON();
      attrs.colorid = model.getColorId();

      return attrs;
    });

    this.renderTemplate(data);
  },

  renderLoading: function() {
    this.el.innerHTML = "Laster spennende ting...";
  }

});


module.exports = CardListView;
},{"../base/view":15,"./template.hb":21}],21:[function(require,module,exports){
// hbsfy compiled Handlebars template
var Handlebars = require('hbsfy/runtime');
module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n        <li><a href=\"#kort/";
  if (helper = helpers.key) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.key); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" class=\"bulb colorid-";
  if (helper = helpers.colorid) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.colorid); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n            <span>"
    + escapeExpression(((stack1 = (depth0 && depth0.title)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</span>\n        </a></li>\n    ";
  return buffer;
  }

  buffer += "<nav class=\"navigation\" role=\"navigation\">\n<ul class=\"card-list grid-view container\">\n    ";
  stack1 = helpers.each.call(depth0, depth0, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n</ul>\n</nav>";
  return buffer;
  });

},{"hbsfy/runtime":12}],22:[function(require,module,exports){
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

  var mainEl = document.querySelector("main");
  while (mainEl.firstChild) {
    mainEl.removeChild(mainEl.firstChild);
  }

  mainEl.appendChild(currentElement.el);
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
},{"../card/card":16,"../card/cards":17,"../cardDetails/cardDetails.view":18,"../cardList/cardList.view":20,"../exploratoryList/exploratoryList.view":24,"../navigation/navigation.view":28,"exoskeleton":4}],23:[function(require,module,exports){
// from https://remysharp.com/2010/07/21/throttling-function-calls
var _now = function() {
  return new Date().getTime();
};

exports.throttle = function throttle(fn, thresh, scope) {
  var threshhold = thresh || 250;
  var last, deferTimer;

  return function () {
    var context = scope || this;

    var now = _now(),
        args = arguments;
    if (last && now < last + threshhold) {
      // hold on to it
      clearTimeout(deferTimer);
      deferTimer = setTimeout(function () {
        last = now;
        fn.apply(context, args);
      }, threshhold);
    } else {
      last = now;
      fn.apply(context, args);
    }
  };
};
},{}],24:[function(require,module,exports){
var BaseView = require("../base/view");
var template = require("./template.hb");
var placement = require("./placement");
var utils = require("../common/utils");

var CardListView = BaseView.extend({

  template: template,

  className: "exploratory-list",

  initialize: function() {
    this.listenTo(this.collection, "request", this.renderLoading);
    this.listenTo(this.collection, "sync", this.render);

    this.collection.comparator = "importance";
    this.collection.sort();

    window.onscroll = utils.throttle(this.onWindowScroll, 100, this);
  },

  render: function() {
    var size = this.getElementSize();
    var phase = this.getCurrentPhase();

    var data = this.collection.map(function(model) {
      var attrs = model.toJSON();
      attrs.importance = model.getImportance(phase);
      attrs.colorid = model.getColorId();
      attrs.cid = model.cid;

      return attrs;
    });

    this.renderTemplate(data);

    placement(document.querySelectorAll(".item a"), this.getElementSize());

    this._currentPhase = phase;
  },

  renderLoading: function() {
    this.el.innerHTML = "Laster spennende ting...";
  },

  getElementSize: function () {
    var bodyBoundingRect = document.body.getBoundingClientRect();
    var boundingRect = this.el.getBoundingClientRect();

    var minWidth  = boundingRect.left + document.body.scrollLeft;
    var minHeight = boundingRect.top + document.body.scrollTop;

    return {
      minWidth  : minWidth,
      minHeight : minHeight,
      width     : bodyBoundingRect.width - minWidth,
      height    : bodyBoundingRect.height - minHeight
    };
  },

  onWindowScroll: function() {
    var phase = this.getCurrentPhase();
    this.reevaluateImportance(phase);
  },

  remove: function() {
    window.onscroll = null;
    BaseView.prototype.remove.apply(this, arguments);
  },

  reevaluateImportance: function(phase) {
    if(phase === this._currentPhase) return;

    var elements = document.querySelectorAll(".item a");

    [].forEach.call(elements, function(element) {
      var cid = element.getAttribute("data-cid");
      var model = this.collection.get(cid);

      if(model) {
        var importance = model.getImportance(phase);
        element.className = element.className.replace(/importance-[\d]+/, "importance-" + importance);

      } else {
        element.remove();
      }

    }, this);
    placement(elements, this.getElementSize());

    this._currentPhase = phase;
  },

  getCurrentPhase: function() {
    var scrollTop = document.body.scrollTop;
    var sectionHeight = this.el.offsetHeight / 6;

    return Math.floor(scrollTop / sectionHeight);
  }

});


module.exports = CardListView;
},{"../base/view":15,"../common/utils":23,"./placement":25,"./template.hb":26}],25:[function(require,module,exports){
// fra http://stackoverflow.com/questions/6224571/positioning-multiple-random-sized-absolutely-positioned-elements-so-they-dont

var getSize = function(element) {
    var clone = element.cloneNode();
    element.parentNode.appendChild(clone);

    var returnObj = {
        width:  clone.offsetWidth,
        height: clone.offsetHeight
    };
    clone.remove();

    return returnObj;
};


module.exports = function(elements, options) {

    var minX = options.minWidth || 0;
    var maxX = options.width;
    var minY = options.minHeight || 0;
    var maxY = options.height;
    var filledAreas = [];

    [].forEach.call(elements, function(element) {
        var area;
        var size = getSize(element);

        var randX = 0;
        var randY = 0;

        var width  = size.width;
        var height = size.height;

        var subtractedMaxX = maxX - width;
        var subtractedMaxY = maxY - height;
        var loopCounter = 0;

        do {
            loopCounter++;
            randX = Math.round(minX + ((subtractedMaxX - minX)*(Math.random() % 1)));
            randY = Math.round(minY + ((subtractedMaxY - minY)*(Math.random() % 1)));
            area = {x: randX, y: randY, width: width, height: height};
        } while(checkOverlap(area) && loopCounter < 5000);

        if (loopCounter == 5000) {
            console.log("loopCounter avbrøt plassering");
        }

        filledAreas.push(area);

        element.style.left = randX + "px";
        element.style.top  = randY + "px";
    });

    function checkOverlap(area) {
        var filledAreasLength =  filledAreas.length;
        for (var i = 0; i < filledAreasLength; i++) {

            checkArea = filledAreas[i];

            var bottom1 = area.y + area.height;
            var bottom2 = checkArea.y + checkArea.height;
            var top1    = area.y;
            var top2    = checkArea.y;
            var left1   = area.x;
            var left2   = checkArea.x;
            var right1  = area.x + area.width;
            var right2  = checkArea.x + checkArea.width;

            if (bottom1 < top2 || top1 > bottom2 || right1 < left2 || left1 > right2) {
                continue;
            }
            return true;
        }
        return false;
    }
};
},{}],26:[function(require,module,exports){
// hbsfy compiled Handlebars template
var Handlebars = require('hbsfy/runtime');
module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n    <div class=\"item\">\n        <a href=\"#kort/";
  if (helper = helpers.key) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.key); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" data-cid=\"";
  if (helper = helpers.cid) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.cid); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" class=\"bulb importance-";
  if (helper = helpers.importance) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.importance); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + " colorid-";
  if (helper = helpers.colorid) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.colorid); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n            <span>"
    + escapeExpression(((stack1 = (depth0 && depth0.title)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</span>\n        </a>\n    </div>\n";
  return buffer;
  }

  stack1 = helpers.each.call(depth0, depth0, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { return stack1; }
  else { return ''; }
  });

},{"hbsfy/runtime":12}],27:[function(require,module,exports){
var Exoskeleton = require("exoskeleton");
var Router = require("./common/router");

var router = new Router();

Exoskeleton.history.start();
},{"./common/router":22,"exoskeleton":4}],28:[function(require,module,exports){
var BaseView = require("../base/view");
var template = require("./template.hb");

var NavigationView = BaseView.extend({

  template: template,

  render: function() {
    var hash = window.location.hash.substr(1);

    this.renderTemplate({
        isListe         : hash === "" ||
                          hash === "liste",
        isExploratory   : hash === "exploratory",
        showBackButton  : hash !== "" &&
                          hash !== "liste" &&
                          hash !== "exploratory"
    });
  }

});

module.exports = NavigationView;
},{"../base/view":15,"./template.hb":29}],29:[function(require,module,exports){
// hbsfy compiled Handlebars template
var Handlebars = require('hbsfy/runtime');
module.exports = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, self=this;

function program1(depth0,data) {
  
  
  return "\n    <a href=\"/\" class=\"closebtn\">\n        <span class=\"visuallyhidden\">Tilbake til forside</span>\n    </a>\n\n";
  }

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n\n    <div class=\"toggle-nav-mode\">\n\n        <a href=\"#exploratory\" class=\"nav-mode icon-bubble";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.isExploratory), {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n            <span class=\"visuallyhidden\">Utforskende navigeringsmodus</span>\n        </a>\n\n        <a href=\"#liste\" class=\"nav-mode icon-grid";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.isListe), {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n            <span class=\"visuallyhidden\">Meny i alfabetisk sortert rekkefølge</span>\n        </a>\n\n    </div>\n";
  return buffer;
  }
function program4(depth0,data) {
  
  
  return " checked";
  }

  buffer += "<div class=\"container logo-container\">\n\n    <img src=\"images/uu-logo.png\" alt=\"logo\"/>\n    ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.showBackButton), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n</div>\n\n";
  return buffer;
  });

},{"hbsfy/runtime":12}],"backbone":[function(require,module,exports){
module.exports = require("exoskeleton");

},{"exoskeleton":4}]},{},[27])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYmFja2JvbmUubmF0aXZlYWpheC9iYWNrYm9uZS5uYXRpdmVhamF4LmpzIiwibm9kZV9tb2R1bGVzL2JhY2tib25lLm5hdGl2ZXZpZXcvYmFja2JvbmUubmF0aXZldmlldy5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L2xpYi9fZW1wdHkuanMiLCJub2RlX21vZHVsZXMvZXhvc2tlbGV0b24vZXhvc2tlbGV0b24uanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzLnJ1bnRpbWUuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2Jhc2UuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL2V4Y2VwdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYnNmeS9ydW50aW1lLmpzIiwic3JjL2Jhc2UvY29sbGVjdGlvbi5qcyIsInNyYy9iYXNlL21vZGVsLmpzIiwic3JjL2Jhc2Uvdmlldy5qcyIsInNyYy9jYXJkL2NhcmQuanMiLCJzcmMvY2FyZC9jYXJkcy5qcyIsInNyYy9jYXJkRGV0YWlscy9jYXJkRGV0YWlscy52aWV3LmpzIiwic3JjL2NhcmREZXRhaWxzL3RlbXBsYXRlLmhiIiwic3JjL2NhcmRMaXN0L2NhcmRMaXN0LnZpZXcuanMiLCJzcmMvY2FyZExpc3QvdGVtcGxhdGUuaGIiLCJzcmMvY29tbW9uL3JvdXRlci5qcyIsInNyYy9jb21tb24vdXRpbHMuanMiLCJzcmMvZXhwbG9yYXRvcnlMaXN0L2V4cGxvcmF0b3J5TGlzdC52aWV3LmpzIiwic3JjL2V4cGxvcmF0b3J5TGlzdC9wbGFjZW1lbnQuanMiLCJzcmMvZXhwbG9yYXRvcnlMaXN0L3RlbXBsYXRlLmhiIiwic3JjL21haW4uanMiLCJzcmMvbmF2aWdhdGlvbi9uYXZpZ2F0aW9uLnZpZXcuanMiLCJzcmMvbmF2aWdhdGlvbi90ZW1wbGF0ZS5oYiIsInNoaW0vYmFja2JvbmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDektBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2p1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBCYWNrYm9uZS5OYXRpdmVBamF4LmpzIDAuMi4wXG4vLyAtLS0tLS0tLS0tLS0tLS1cblxuLy8gICAgIChjKSAyMDE0IEFkYW0gS3JlYnMsIFBhdWwgTWlsbGVyLCBFeG9za2VsZXRvbiBQcm9qZWN0XG4vLyAgICAgQmFja2JvbmUuTmF0aXZlQWpheCBtYXkgYmUgZnJlZWx5IGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbi8vICAgICBGb3IgYWxsIGRldGFpbHMgYW5kIGRvY3VtZW50YXRpb246XG4vLyAgICAgaHR0cHM6Ly9naXRodWIuY29tL2FrcmU1NC9CYWNrYm9uZS5OYXRpdmVBamF4XG5cbihmdW5jdGlvbiAoZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7IGRlZmluZShbJ2JhY2tib25lJ10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JykgeyBmYWN0b3J5KHJlcXVpcmUoJ2JhY2tib25lJykpO1xuICB9IGVsc2UgeyBmYWN0b3J5KEJhY2tib25lKTsgfVxufShmdW5jdGlvbiAoQmFja2JvbmUpIHtcbiAgLy8gTWFrZSBhbiBBSkFYIHJlcXVlc3QgdG8gdGhlIHNlcnZlci5cbiAgLy8gVXNhZ2U6XG4gIC8vICAgdmFyIHJlcSA9IEJhY2tib25lLmFqYXgoe3VybDogJ3VybCcsIHR5cGU6ICdQQVRDSCcsIGRhdGE6ICdkYXRhJ30pO1xuICAvLyAgIHJlcS5kb25lKC4uLikuZXJyb3IoLi4uKSAvLyBpZiBCYWNrYm9uZS5EZWZlcnJlZCBpcyBzZXRcbiAgQmFja2JvbmUuYWpheCA9IChmdW5jdGlvbigpIHtcbiAgICB2YXIgeG1sUmUgPSAvXig/OmFwcGxpY2F0aW9ufHRleHQpXFwveG1sLztcbiAgICB2YXIganNvblJlID0gL15hcHBsaWNhdGlvblxcL2pzb24vO1xuXG4gICAgdmFyIGdldERhdGEgPSBmdW5jdGlvbihhY2NlcHRzLCB4aHIpIHtcbiAgICAgIGlmIChhY2NlcHRzID09IG51bGwpIGFjY2VwdHMgPSB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ2NvbnRlbnQtdHlwZScpO1xuICAgICAgaWYgKHhtbFJlLnRlc3QoYWNjZXB0cykpIHtcbiAgICAgICAgcmV0dXJuIHhoci5yZXNwb25zZVhNTDtcbiAgICAgIH0gZWxzZSBpZiAoanNvblJlLnRlc3QoYWNjZXB0cykpIHtcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4geGhyLnJlc3BvbnNlVGV4dDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGlzVmFsaWQgPSBmdW5jdGlvbih4aHIpIHtcbiAgICAgIHJldHVybiAoeGhyLnN0YXR1cyA+PSAyMDAgJiYgeGhyLnN0YXR1cyA8IDMwMCkgfHxcbiAgICAgICAgKHhoci5zdGF0dXMgPT09IDMwNCkgfHxcbiAgICAgICAgKHhoci5zdGF0dXMgPT09IDAgJiYgd2luZG93LmxvY2F0aW9uLnByb3RvY29sID09PSAnZmlsZTonKVxuICAgIH07XG5cbiAgICB2YXIgZW5kID0gZnVuY3Rpb24oeGhyLCBvcHRpb25zLCBkZWZlcnJlZCkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgIT09IDQpIHJldHVybjtcblxuICAgICAgICB2YXIgc3RhdHVzID0geGhyLnN0YXR1cztcbiAgICAgICAgdmFyIGRhdGEgPSBnZXREYXRhKG9wdGlvbnMuaGVhZGVycyAmJiBvcHRpb25zLmhlYWRlcnMuQWNjZXB0LCB4aHIpO1xuXG4gICAgICAgIC8vIENoZWNrIGZvciB2YWxpZGl0eS5cbiAgICAgICAgaWYgKGlzVmFsaWQoeGhyKSkge1xuICAgICAgICAgIGlmIChvcHRpb25zLnN1Y2Nlc3MpIG9wdGlvbnMuc3VjY2VzcyhkYXRhKTtcbiAgICAgICAgICBpZiAoZGVmZXJyZWQpIGRlZmVycmVkLnJlc29sdmUoZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIGVycm9yID0gbmV3IEVycm9yKCdTZXJ2ZXIgcmVzcG9uZGVkIHdpdGggYSBzdGF0dXMgb2YgJyArIHN0YXR1cyk7XG4gICAgICAgICAgaWYgKG9wdGlvbnMuZXJyb3IpIG9wdGlvbnMuZXJyb3IoeGhyLCBzdGF0dXMsIGVycm9yKTtcbiAgICAgICAgICBpZiAoZGVmZXJyZWQpIGRlZmVycmVkLnJlamVjdCh4aHIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICBpZiAob3B0aW9ucyA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBtdXN0IHByb3ZpZGUgb3B0aW9ucycpO1xuICAgICAgaWYgKG9wdGlvbnMudHlwZSA9PSBudWxsKSBvcHRpb25zLnR5cGUgPSAnR0VUJztcblxuICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgdmFyIGRlZmVycmVkID0gQmFja2JvbmUuRGVmZXJyZWQgJiYgQmFja2JvbmUuRGVmZXJyZWQoKTtcblxuICAgICAgaWYgKG9wdGlvbnMuY29udGVudFR5cGUpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuaGVhZGVycyA9PSBudWxsKSBvcHRpb25zLmhlYWRlcnMgPSB7fTtcbiAgICAgICAgb3B0aW9ucy5oZWFkZXJzWydDb250ZW50LVR5cGUnXSA9IG9wdGlvbnMuY29udGVudFR5cGU7XG4gICAgICB9XG5cbiAgICAgIC8vIFN0cmluZ2lmeSBHRVQgcXVlcnkgcGFyYW1zLlxuICAgICAgaWYgKG9wdGlvbnMudHlwZSA9PT0gJ0dFVCcgJiYgdHlwZW9mIG9wdGlvbnMuZGF0YSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgdmFyIHF1ZXJ5ID0gJyc7XG4gICAgICAgIHZhciBzdHJpbmdpZnlLZXlWYWx1ZVBhaXIgPSBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbHVlID09IG51bGwgPyAnJyA6XG4gICAgICAgICAgICAnJicgKyBlbmNvZGVVUklDb21wb25lbnQoa2V5KSArXG4gICAgICAgICAgICAnPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICAgICAgICB9O1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gb3B0aW9ucy5kYXRhKSB7XG4gICAgICAgICAgcXVlcnkgKz0gc3RyaW5naWZ5S2V5VmFsdWVQYWlyKGtleSwgb3B0aW9ucy5kYXRhW2tleV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgICAgdmFyIHNlcCA9IChvcHRpb25zLnVybC5pbmRleE9mKCc/JykgPT09IC0xKSA/ICc/JyA6ICcmJztcbiAgICAgICAgICBvcHRpb25zLnVybCArPSBzZXAgKyBxdWVyeS5zdWJzdHJpbmcoMSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKG9wdGlvbnMuY3JlZGVudGlhbHMpIG9wdGlvbnMud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcbiAgICAgIHhoci5hZGRFdmVudExpc3RlbmVyKCdyZWFkeXN0YXRlY2hhbmdlJywgZW5kKHhociwgb3B0aW9ucywgZGVmZXJyZWQpKTtcbiAgICAgIHhoci5vcGVuKG9wdGlvbnMudHlwZSwgb3B0aW9ucy51cmwsIHRydWUpO1xuXG4gICAgICB2YXIgYWxsVHlwZXMgPSBcIiovXCIuY29uY2F0KFwiKlwiKTtcbiAgICAgIHZhciB4aHJBY2NlcHRzID0ge1xuICAgICAgICBcIipcIjogYWxsVHlwZXMsXG4gICAgICAgIHRleHQ6IFwidGV4dC9wbGFpblwiLFxuICAgICAgICBodG1sOiBcInRleHQvaHRtbFwiLFxuICAgICAgICB4bWw6IFwiYXBwbGljYXRpb24veG1sLCB0ZXh0L3htbFwiLFxuICAgICAgICBqc29uOiBcImFwcGxpY2F0aW9uL2pzb24sIHRleHQvamF2YXNjcmlwdFwiXG4gICAgICB9O1xuICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoXG4gICAgICAgIFwiQWNjZXB0XCIsXG4gICAgICAgIG9wdGlvbnMuZGF0YVR5cGUgJiYgeGhyQWNjZXB0c1tvcHRpb25zLmRhdGFUeXBlXSA/XG4gICAgICAgICAgeGhyQWNjZXB0c1tvcHRpb25zLmRhdGFUeXBlXSArIChvcHRpb25zLmRhdGFUeXBlICE9PSBcIipcIiA/IFwiLCBcIiArIGFsbFR5cGVzICsgXCI7IHE9MC4wMVwiIDogXCJcIiApIDpcbiAgICAgICAgICB4aHJBY2NlcHRzW1wiKlwiXVxuICAgICAgKTtcblxuICAgICAgaWYgKG9wdGlvbnMuaGVhZGVycykgZm9yICh2YXIga2V5IGluIG9wdGlvbnMuaGVhZGVycykge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihrZXksIG9wdGlvbnMuaGVhZGVyc1trZXldKTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLmJlZm9yZVNlbmQpIG9wdGlvbnMuYmVmb3JlU2VuZCh4aHIpO1xuICAgICAgeGhyLnNlbmQob3B0aW9ucy5kYXRhKTtcblxuICAgICAgcmV0dXJuIGRlZmVycmVkID8gZGVmZXJyZWQucHJvbWlzZSA6IHVuZGVmaW5lZDtcbiAgICB9O1xuICB9KSgpO1xufSkpO1xuIiwiLy8gQmFja2JvbmUuTmF0aXZlVmlldy5qcyAwLjMuMlxuLy8gLS0tLS0tLS0tLS0tLS0tXG5cbi8vICAgICAoYykgMjAxNCBBZGFtIEtyZWJzLCBKaW1teSBZdWVuIEhvIFdvbmdcbi8vICAgICBCYWNrYm9uZS5OYXRpdmVWaWV3IG1heSBiZSBmcmVlbHkgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuLy8gICAgIEZvciBhbGwgZGV0YWlscyBhbmQgZG9jdW1lbnRhdGlvbjpcbi8vICAgICBodHRwczovL2dpdGh1Yi5jb20vYWtyZTU0L0JhY2tib25lLk5hdGl2ZVZpZXdcblxuKGZ1bmN0aW9uIChmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHsgZGVmaW5lKFsnYmFja2JvbmUnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7IGZhY3RvcnkocmVxdWlyZSgnYmFja2JvbmUnKSk7XG4gIH0gZWxzZSB7IGZhY3RvcnkoQmFja2JvbmUpOyB9XG59KGZ1bmN0aW9uIChCYWNrYm9uZSkge1xuICAvLyBDYWNoZWQgcmVnZXggdG8gbWF0Y2ggYW4gb3BlbmluZyAnPCcgb2YgYW4gSFRNTCB0YWcsIHBvc3NpYmx5IGxlZnQtcGFkZGVkXG4gIC8vIHdpdGggd2hpdGVzcGFjZS5cbiAgdmFyIHBhZGRlZEx0ID0gL15cXHMqPC87XG5cbiAgLy8gQ2FjaGVzIGEgbG9jYWwgcmVmZXJlbmNlIHRvIGBFbGVtZW50LnByb3RvdHlwZWAgZm9yIGZhc3RlciBhY2Nlc3MuXG4gIHZhciBFbGVtZW50UHJvdG8gPSAodHlwZW9mIEVsZW1lbnQgIT09ICd1bmRlZmluZWQnICYmIEVsZW1lbnQucHJvdG90eXBlKSB8fCB7fTtcblxuICAvLyBDcm9zcy1icm93c2VyIGV2ZW50IGxpc3RlbmVyIHNoaW1zXG4gIHZhciBlbGVtZW50QWRkRXZlbnRMaXN0ZW5lciA9IEVsZW1lbnRQcm90by5hZGRFdmVudExpc3RlbmVyIHx8IGZ1bmN0aW9uKGV2ZW50TmFtZSwgbGlzdGVuZXIpIHtcbiAgICByZXR1cm4gdGhpcy5hdHRhY2hFdmVudCgnb24nICsgZXZlbnROYW1lLCBsaXN0ZW5lcik7XG4gIH1cbiAgdmFyIGVsZW1lbnRSZW1vdmVFdmVudExpc3RlbmVyID0gRWxlbWVudFByb3RvLnJlbW92ZUV2ZW50TGlzdGVuZXIgfHwgZnVuY3Rpb24oZXZlbnROYW1lLCBsaXN0ZW5lcikge1xuICAgIHJldHVybiB0aGlzLmRldGFjaEV2ZW50KCdvbicgKyBldmVudE5hbWUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHZhciBpbmRleE9mID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0pIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYXJyYXkubGVuZ3RoOyBpIDwgbGVuOyBpKyspIGlmIChhcnJheVtpXSA9PT0gaXRlbSkgcmV0dXJuIGk7XG4gICAgcmV0dXJuIC0xO1xuICB9XG5cbiAgLy8gRmluZCB0aGUgcmlnaHQgYEVsZW1lbnQjbWF0Y2hlc2AgZm9yIElFPj05IGFuZCBtb2Rlcm4gYnJvd3NlcnMuXG4gIHZhciBtYXRjaGVzU2VsZWN0b3IgPSBFbGVtZW50UHJvdG8ubWF0Y2hlcyB8fFxuICAgICAgRWxlbWVudFByb3RvLndlYmtpdE1hdGNoZXNTZWxlY3RvciB8fFxuICAgICAgRWxlbWVudFByb3RvLm1vek1hdGNoZXNTZWxlY3RvciB8fFxuICAgICAgRWxlbWVudFByb3RvLm1zTWF0Y2hlc1NlbGVjdG9yIHx8XG4gICAgICBFbGVtZW50UHJvdG8ub01hdGNoZXNTZWxlY3RvciB8fFxuICAgICAgLy8gTWFrZSBvdXIgb3duIGBFbGVtZW50I21hdGNoZXNgIGZvciBJRThcbiAgICAgIGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICAgIC8vIFVzZSBxdWVyeVNlbGVjdG9yQWxsIHRvIGZpbmQgYWxsIGVsZW1lbnRzIG1hdGNoaW5nIHRoZSBzZWxlY3RvcixcbiAgICAgICAgLy8gdGhlbiBjaGVjayBpZiB0aGUgZ2l2ZW4gZWxlbWVudCBpcyBpbmNsdWRlZCBpbiB0aGF0IGxpc3QuXG4gICAgICAgIC8vIEV4ZWN1dGluZyB0aGUgcXVlcnkgb24gdGhlIHBhcmVudE5vZGUgcmVkdWNlcyB0aGUgcmVzdWx0aW5nIG5vZGVMaXN0LFxuICAgICAgICAvLyAoZG9jdW1lbnQgZG9lc24ndCBoYXZlIGEgcGFyZW50Tm9kZSkuXG4gICAgICAgIHZhciBub2RlTGlzdCA9ICh0aGlzLnBhcmVudE5vZGUgfHwgZG9jdW1lbnQpLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpIHx8IFtdO1xuICAgICAgICByZXR1cm4gISF+aW5kZXhPZihub2RlTGlzdCwgdGhpcyk7XG4gICAgICB9O1xuXG4gIC8vIENhY2hlIEJhY2tib25lLlZpZXcgZm9yIGxhdGVyIGFjY2VzcyBpbiBjb25zdHJ1Y3RvclxuICB2YXIgQkJWaWV3ID0gQmFja2JvbmUuVmlldztcblxuICAvLyBUbyBleHRlbmQgYW4gZXhpc3RpbmcgdmlldyB0byB1c2UgbmF0aXZlIG1ldGhvZHMsIGV4dGVuZCB0aGUgVmlldyBwcm90b3R5cGVcbiAgLy8gd2l0aCB0aGUgbWl4aW46IF8uZXh0ZW5kKE15Vmlldy5wcm90b3R5cGUsIEJhY2tib25lLk5hdGl2ZVZpZXdNaXhpbik7XG4gIEJhY2tib25lLk5hdGl2ZVZpZXdNaXhpbiA9IHtcblxuICAgIF9kb21FdmVudHM6IG51bGwsXG5cbiAgICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9kb21FdmVudHMgPSBbXTtcbiAgICAgIHJldHVybiBCQlZpZXcuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9LFxuXG4gICAgJDogZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICAgIHJldHVybiB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgIH0sXG5cbiAgICBfcmVtb3ZlRWxlbWVudDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnVuZGVsZWdhdGVFdmVudHMoKTtcbiAgICAgIGlmICh0aGlzLmVsLnBhcmVudE5vZGUpIHRoaXMuZWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmVsKTtcbiAgICB9LFxuXG4gICAgLy8gQXBwbHkgdGhlIGBlbGVtZW50YCB0byB0aGUgdmlldy4gYGVsZW1lbnRgIGNhbiBiZSBhIENTUyBzZWxlY3RvcixcbiAgICAvLyBhIHN0cmluZyBvZiBIVE1MLCBvciBhbiBFbGVtZW50IG5vZGUuXG4gICAgX3NldEVsZW1lbnQ6IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICAgIGlmICh0eXBlb2YgZWxlbWVudCA9PSAnc3RyaW5nJykge1xuICAgICAgICBpZiAocGFkZGVkTHQudGVzdChlbGVtZW50KSkge1xuICAgICAgICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgIGVsLmlubmVySFRNTCA9IGVsZW1lbnQ7XG4gICAgICAgICAgdGhpcy5lbCA9IGVsLmZpcnN0Q2hpbGQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5lbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWwgPSBlbGVtZW50O1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBTZXQgYSBoYXNoIG9mIGF0dHJpYnV0ZXMgdG8gdGhlIHZpZXcncyBgZWxgLiBXZSB1c2UgdGhlIFwicHJvcFwiIHZlcnNpb25cbiAgICAvLyBpZiBhdmFpbGFibGUsIGZhbGxpbmcgYmFjayB0byBgc2V0QXR0cmlidXRlYCBmb3IgdGhlIGNhdGNoLWFsbC5cbiAgICBfc2V0QXR0cmlidXRlczogZnVuY3Rpb24oYXR0cnMpIHtcbiAgICAgIGZvciAodmFyIGF0dHIgaW4gYXR0cnMpIHtcbiAgICAgICAgYXR0ciBpbiB0aGlzLmVsID8gdGhpcy5lbFthdHRyXSA9IGF0dHJzW2F0dHJdIDogdGhpcy5lbC5zZXRBdHRyaWJ1dGUoYXR0ciwgYXR0cnNbYXR0cl0pO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBNYWtlIGEgZXZlbnQgZGVsZWdhdGlvbiBoYW5kbGVyIGZvciB0aGUgZ2l2ZW4gYGV2ZW50TmFtZWAgYW5kIGBzZWxlY3RvcmBcbiAgICAvLyBhbmQgYXR0YWNoIGl0IHRvIGB0aGlzLmVsYC5cbiAgICAvLyBJZiBzZWxlY3RvciBpcyBlbXB0eSwgdGhlIGxpc3RlbmVyIHdpbGwgYmUgYm91bmQgdG8gYHRoaXMuZWxgLiBJZiBub3QsIGFcbiAgICAvLyBuZXcgaGFuZGxlciB0aGF0IHdpbGwgcmVjdXJzaXZlbHkgdHJhdmVyc2UgdXAgdGhlIGV2ZW50IHRhcmdldCdzIERPTVxuICAgIC8vIGhpZXJhcmNoeSBsb29raW5nIGZvciBhIG5vZGUgdGhhdCBtYXRjaGVzIHRoZSBzZWxlY3Rvci4gSWYgb25lIGlzIGZvdW5kLFxuICAgIC8vIHRoZSBldmVudCdzIGBkZWxlZ2F0ZVRhcmdldGAgcHJvcGVydHkgaXMgc2V0IHRvIGl0IGFuZCB0aGUgcmV0dXJuIHRoZVxuICAgIC8vIHJlc3VsdCBvZiBjYWxsaW5nIGJvdW5kIGBsaXN0ZW5lcmAgd2l0aCB0aGUgcGFyYW1ldGVycyBnaXZlbiB0byB0aGVcbiAgICAvLyBoYW5kbGVyLlxuICAgIGRlbGVnYXRlOiBmdW5jdGlvbihldmVudE5hbWUsIHNlbGVjdG9yLCBsaXN0ZW5lcikge1xuICAgICAgaWYgKHR5cGVvZiBzZWxlY3RvciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBsaXN0ZW5lciA9IHNlbGVjdG9yO1xuICAgICAgICBzZWxlY3RvciA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHZhciByb290ID0gdGhpcy5lbDtcbiAgICAgIHZhciBoYW5kbGVyID0gc2VsZWN0b3IgPyBmdW5jdGlvbiAoZSkge1xuICAgICAgICB2YXIgbm9kZSA9IGUudGFyZ2V0IHx8IGUuc3JjRWxlbWVudDtcbiAgICAgICAgZm9yICg7IG5vZGUgJiYgbm9kZSAhPSByb290OyBub2RlID0gbm9kZS5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgaWYgKG1hdGNoZXNTZWxlY3Rvci5jYWxsKG5vZGUsIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgZS5kZWxlZ2F0ZVRhcmdldCA9IG5vZGU7XG4gICAgICAgICAgICBsaXN0ZW5lcihlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gOiBsaXN0ZW5lcjtcblxuICAgICAgZWxlbWVudEFkZEV2ZW50TGlzdGVuZXIuY2FsbCh0aGlzLmVsLCBldmVudE5hbWUsIGhhbmRsZXIsIGZhbHNlKTtcbiAgICAgIHRoaXMuX2RvbUV2ZW50cy5wdXNoKHtldmVudE5hbWU6IGV2ZW50TmFtZSwgaGFuZGxlcjogaGFuZGxlciwgbGlzdGVuZXI6IGxpc3RlbmVyLCBzZWxlY3Rvcjogc2VsZWN0b3J9KTtcbiAgICAgIHJldHVybiBoYW5kbGVyO1xuICAgIH0sXG5cbiAgICAvLyBSZW1vdmUgYSBzaW5nbGUgZGVsZWdhdGVkIGV2ZW50LiBFaXRoZXIgYGV2ZW50TmFtZWAgb3IgYHNlbGVjdG9yYCBtdXN0XG4gICAgLy8gYmUgaW5jbHVkZWQsIGBzZWxlY3RvcmAgYW5kIGBsaXN0ZW5lcmAgYXJlIG9wdGlvbmFsLlxuICAgIHVuZGVsZWdhdGU6IGZ1bmN0aW9uKGV2ZW50TmFtZSwgc2VsZWN0b3IsIGxpc3RlbmVyKSB7XG4gICAgICBpZiAodHlwZW9mIHNlbGVjdG9yID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGxpc3RlbmVyID0gc2VsZWN0b3I7XG4gICAgICAgIHNlbGVjdG9yID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuZWwpIHtcbiAgICAgICAgdmFyIGhhbmRsZXJzID0gdGhpcy5fZG9tRXZlbnRzLnNsaWNlKCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBoYW5kbGVycy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgIHZhciBpdGVtID0gaGFuZGxlcnNbaV07XG5cbiAgICAgICAgICB2YXIgbWF0Y2ggPSBpdGVtLmV2ZW50TmFtZSA9PT0gZXZlbnROYW1lICYmXG4gICAgICAgICAgICAgIChsaXN0ZW5lciA/IGl0ZW0ubGlzdGVuZXIgPT09IGxpc3RlbmVyIDogdHJ1ZSkgJiZcbiAgICAgICAgICAgICAgKHNlbGVjdG9yID8gaXRlbS5zZWxlY3RvciA9PT0gc2VsZWN0b3IgOiB0cnVlKTtcblxuICAgICAgICAgIGlmICghbWF0Y2gpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgZWxlbWVudFJlbW92ZUV2ZW50TGlzdGVuZXIuY2FsbCh0aGlzLmVsLCBpdGVtLmV2ZW50TmFtZSwgaXRlbS5oYW5kbGVyLCBmYWxzZSk7XG4gICAgICAgICAgdGhpcy5fZG9tRXZlbnRzLnNwbGljZShpbmRleE9mKGhhbmRsZXJzLCBpdGVtKSwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvLyBSZW1vdmUgYWxsIGV2ZW50cyBjcmVhdGVkIHdpdGggYGRlbGVnYXRlYCBmcm9tIGBlbGBcbiAgICB1bmRlbGVnYXRlRXZlbnRzOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLmVsKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLl9kb21FdmVudHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICB2YXIgaXRlbSA9IHRoaXMuX2RvbUV2ZW50c1tpXTtcbiAgICAgICAgICBlbGVtZW50UmVtb3ZlRXZlbnRMaXN0ZW5lci5jYWxsKHRoaXMuZWwsIGl0ZW0uZXZlbnROYW1lLCBpdGVtLmhhbmRsZXIsIGZhbHNlKTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fZG9tRXZlbnRzLmxlbmd0aCA9IDA7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG5cbiAgQmFja2JvbmUuTmF0aXZlVmlldyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKEJhY2tib25lLk5hdGl2ZVZpZXdNaXhpbik7XG5cbiAgcmV0dXJuIEJhY2tib25lLk5hdGl2ZVZpZXc7XG59KSk7XG4iLG51bGwsIi8qIVxuICogRXhvc2tlbGV0b24uanMgMC43LjBcbiAqIChjKSAyMDEzIFBhdWwgTWlsbGVyIDxodHRwOi8vcGF1bG1pbGxyLmNvbT5cbiAqIEJhc2VkIG9uIEJhY2tib25lLmpzXG4gKiAoYykgMjAxMC0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZFxuICogRXhvc2tlbGV0b24gbWF5IGJlIGZyZWVseSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4gKiBGb3IgYWxsIGRldGFpbHMgYW5kIGRvY3VtZW50YXRpb246IDxodHRwOi8vZXhvc2pzLmNvbT5cbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICAvLyBTZXQgdXAgQmFja2JvbmUgYXBwcm9wcmlhdGVseSBmb3IgdGhlIGVudmlyb25tZW50LlxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKFsndW5kZXJzY29yZScsICdqcXVlcnknLCAnZXhwb3J0cyddLCBmdW5jdGlvbihfLCAkLCBleHBvcnRzKSB7XG4gICAgICByb290LkJhY2tib25lID0gcm9vdC5FeG9za2VsZXRvbiA9IGZhY3Rvcnkocm9vdCwgZXhwb3J0cywgXywgJCk7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgdmFyIF8sICQ7XG4gICAgdHJ5IHsgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTsgfSBjYXRjaChlKSB7IH1cbiAgICB0cnkgeyAkID0gcmVxdWlyZSgnanF1ZXJ5Jyk7IH0gY2F0Y2goZSkgeyB9XG4gICAgZmFjdG9yeShyb290LCBleHBvcnRzLCBfLCAkKTtcbiAgfSBlbHNlIHtcbiAgICByb290LkJhY2tib25lID0gcm9vdC5FeG9za2VsZXRvbiA9IGZhY3Rvcnkocm9vdCwge30sIHJvb3QuXywgKHJvb3QualF1ZXJ5IHx8IHJvb3QuWmVwdG8gfHwgcm9vdC5lbmRlciB8fCByb290LiQpKTtcbiAgfVxuXG59KSh0aGlzLCBmdW5jdGlvbihyb290LCBCYWNrYm9uZSwgXywgJCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gSW5pdGlhbCBTZXR1cFxuICAvLyAtLS0tLS0tLS0tLS0tXG5cbiAgLy8gU2F2ZSB0aGUgcHJldmlvdXMgdmFsdWUgb2YgdGhlIGBCYWNrYm9uZWAgdmFyaWFibGUsIHNvIHRoYXQgaXQgY2FuIGJlXG4gIC8vIHJlc3RvcmVkIGxhdGVyIG9uLCBpZiBgbm9Db25mbGljdGAgaXMgdXNlZC5cbiAgdmFyIHByZXZpb3VzQmFja2JvbmUgPSByb290LkJhY2tib25lO1xuICB2YXIgcHJldmlvdXNFeG9za2VsZXRvbiA9IHJvb3QuRXhvc2tlbGV0b247XG5cbiAgLy8gVW5kZXJzY29yZSByZXBsYWNlbWVudC5cbiAgdmFyIHV0aWxzID0gQmFja2JvbmUudXRpbHMgPSBfID0gKF8gfHwge30pO1xuXG4gIC8vIEhvbGQgb250byBhIGxvY2FsIHJlZmVyZW5jZSB0byBgJGAuIENhbiBiZSBjaGFuZ2VkIGF0IGFueSBwb2ludC5cbiAgQmFja2JvbmUuJCA9ICQ7XG5cbiAgLy8gQ3JlYXRlIGxvY2FsIHJlZmVyZW5jZXMgdG8gYXJyYXkgbWV0aG9kcyB3ZSdsbCB3YW50IHRvIHVzZSBsYXRlci5cbiAgdmFyIGFycmF5ID0gW107XG4gIHZhciBwdXNoID0gYXJyYXkucHVzaDtcbiAgdmFyIHNsaWNlID0gYXJyYXkuc2xpY2U7XG4gIHZhciB0b1N0cmluZyA9ICh7fSkudG9TdHJpbmc7XG5cbiAgLy8gQ3VycmVudCB2ZXJzaW9uIG9mIHRoZSBsaWJyYXJ5LiBLZWVwIGluIHN5bmMgd2l0aCBgcGFja2FnZS5qc29uYC5cbiAgLy8gQmFja2JvbmUuVkVSU0lPTiA9ICcxLjAuMCc7XG5cbiAgLy8gUnVucyBCYWNrYm9uZS5qcyBpbiAqbm9Db25mbGljdCogbW9kZSwgcmV0dXJuaW5nIHRoZSBgQmFja2JvbmVgIHZhcmlhYmxlXG4gIC8vIHRvIGl0cyBwcmV2aW91cyBvd25lci4gUmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGlzIEJhY2tib25lIG9iamVjdC5cbiAgQmFja2JvbmUubm9Db25mbGljdCA9IGZ1bmN0aW9uKCkge1xuICAgIHJvb3QuQmFja2JvbmUgPSBwcmV2aW91c0JhY2tib25lO1xuICAgIHJvb3QuRXhvc2tlbGV0b24gPSBwcmV2aW91c0V4b3NrZWxldG9uO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8vIEhlbHBlcnNcbiAgLy8gLS0tLS0tLVxuXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBjb3JyZWN0bHkgc2V0IHVwIHRoZSBwcm90b3R5cGUgY2hhaW4sIGZvciBzdWJjbGFzc2VzLlxuICAvLyBTaW1pbGFyIHRvIGBnb29nLmluaGVyaXRzYCwgYnV0IHVzZXMgYSBoYXNoIG9mIHByb3RvdHlwZSBwcm9wZXJ0aWVzIGFuZFxuICAvLyBjbGFzcyBwcm9wZXJ0aWVzIHRvIGJlIGV4dGVuZGVkLlxuICBCYWNrYm9uZS5leHRlbmQgPSBmdW5jdGlvbihwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykge1xuICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgIHZhciBjaGlsZDtcblxuICAgIC8vIFRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgdGhlIG5ldyBzdWJjbGFzcyBpcyBlaXRoZXIgZGVmaW5lZCBieSB5b3VcbiAgICAvLyAodGhlIFwiY29uc3RydWN0b3JcIiBwcm9wZXJ0eSBpbiB5b3VyIGBleHRlbmRgIGRlZmluaXRpb24pLCBvciBkZWZhdWx0ZWRcbiAgICAvLyBieSB1cyB0byBzaW1wbHkgY2FsbCB0aGUgcGFyZW50J3MgY29uc3RydWN0b3IuXG4gICAgaWYgKHByb3RvUHJvcHMgJiYgXy5oYXMocHJvdG9Qcm9wcywgJ2NvbnN0cnVjdG9yJykpIHtcbiAgICAgIGNoaWxkID0gcHJvdG9Qcm9wcy5jb25zdHJ1Y3RvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgY2hpbGQgPSBmdW5jdGlvbigpeyByZXR1cm4gcGFyZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7IH07XG4gICAgfVxuXG4gICAgLy8gQWRkIHN0YXRpYyBwcm9wZXJ0aWVzIHRvIHRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiwgaWYgc3VwcGxpZWQuXG4gICAgXy5leHRlbmQoY2hpbGQsIHBhcmVudCwgc3RhdGljUHJvcHMpO1xuXG4gICAgLy8gU2V0IHRoZSBwcm90b3R5cGUgY2hhaW4gdG8gaW5oZXJpdCBmcm9tIGBwYXJlbnRgLCB3aXRob3V0IGNhbGxpbmdcbiAgICAvLyBgcGFyZW50YCdzIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuICAgIHZhciBTdXJyb2dhdGUgPSBmdW5jdGlvbigpeyB0aGlzLmNvbnN0cnVjdG9yID0gY2hpbGQ7IH07XG4gICAgU3Vycm9nYXRlLnByb3RvdHlwZSA9IHBhcmVudC5wcm90b3R5cGU7XG4gICAgY2hpbGQucHJvdG90eXBlID0gbmV3IFN1cnJvZ2F0ZTtcblxuICAgIC8vIEFkZCBwcm90b3R5cGUgcHJvcGVydGllcyAoaW5zdGFuY2UgcHJvcGVydGllcykgdG8gdGhlIHN1YmNsYXNzLFxuICAgIC8vIGlmIHN1cHBsaWVkLlxuICAgIGlmIChwcm90b1Byb3BzKSBfLmV4dGVuZChjaGlsZC5wcm90b3R5cGUsIHByb3RvUHJvcHMpO1xuXG4gICAgLy8gU2V0IGEgY29udmVuaWVuY2UgcHJvcGVydHkgaW4gY2FzZSB0aGUgcGFyZW50J3MgcHJvdG90eXBlIGlzIG5lZWRlZFxuICAgIC8vIGxhdGVyLlxuICAgIGNoaWxkLl9fc3VwZXJfXyA9IHBhcmVudC5wcm90b3R5cGU7XG5cbiAgICByZXR1cm4gY2hpbGQ7XG4gIH07XG5cbiAgLy8gVGhyb3cgYW4gZXJyb3Igd2hlbiBhIFVSTCBpcyBuZWVkZWQsIGFuZCBub25lIGlzIHN1cHBsaWVkLlxuICB2YXIgdXJsRXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0EgXCJ1cmxcIiBwcm9wZXJ0eSBvciBmdW5jdGlvbiBtdXN0IGJlIHNwZWNpZmllZCcpO1xuICB9O1xuXG4gIC8vIFdyYXAgYW4gb3B0aW9uYWwgZXJyb3IgY2FsbGJhY2sgd2l0aCBhIGZhbGxiYWNrIGVycm9yIGV2ZW50LlxuICB2YXIgd3JhcEVycm9yID0gZnVuY3Rpb24obW9kZWwsIG9wdGlvbnMpIHtcbiAgICB2YXIgZXJyb3IgPSBvcHRpb25zLmVycm9yO1xuICAgIG9wdGlvbnMuZXJyb3IgPSBmdW5jdGlvbihyZXNwKSB7XG4gICAgICBpZiAoZXJyb3IpIGVycm9yKG1vZGVsLCByZXNwLCBvcHRpb25zKTtcbiAgICAgIG1vZGVsLnRyaWdnZXIoJ2Vycm9yJywgbW9kZWwsIHJlc3AsIG9wdGlvbnMpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gQ2hlY2tlciBmb3IgdXRpbGl0eSBtZXRob2RzLiBVc2VmdWwgZm9yIGN1c3RvbSBidWlsZHMuXG4gIHZhciB1dGlsRXhpc3RzID0gZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBfW21ldGhvZF0gPT09ICdmdW5jdGlvbic7XG4gIH07XG51dGlscy5yZXN1bHQgPSBmdW5jdGlvbiByZXN1bHQob2JqZWN0LCBwcm9wZXJ0eSkge1xuICB2YXIgdmFsdWUgPSBvYmplY3QgPyBvYmplY3RbcHJvcGVydHldIDogdW5kZWZpbmVkO1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nID8gb2JqZWN0W3Byb3BlcnR5XSgpIDogdmFsdWU7XG59O1xuXG51dGlscy5kZWZhdWx0cyA9IGZ1bmN0aW9uIGRlZmF1bHRzKG9iaikge1xuICBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgZm9yICh2YXIga2V5IGluIGl0ZW0pIGlmIChvYmpba2V5XSA9PT0gdW5kZWZpbmVkKVxuICAgICAgb2JqW2tleV0gPSBpdGVtW2tleV07XG4gIH0pO1xuICByZXR1cm4gb2JqO1xufTtcblxudXRpbHMuZXh0ZW5kID0gZnVuY3Rpb24gZXh0ZW5kKG9iaikge1xuICBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgZm9yICh2YXIga2V5IGluIGl0ZW0pIG9ialtrZXldID0gaXRlbVtrZXldO1xuICB9KTtcbiAgcmV0dXJuIG9iajtcbn07XG5cbnZhciBodG1sRXNjYXBlcyA9IHtcbiAgJyYnOiAnJmFtcDsnLFxuICAnPCc6ICcmbHQ7JyxcbiAgJz4nOiAnJmd0OycsXG4gICdcIic6ICcmcXVvdDsnLFxuICBcIidcIjogJyYjMzk7J1xufTtcblxudXRpbHMuZXNjYXBlID0gZnVuY3Rpb24gZXNjYXBlKHN0cmluZykge1xuICByZXR1cm4gc3RyaW5nID09IG51bGwgPyAnJyA6IFN0cmluZyhzdHJpbmcpLnJlcGxhY2UoL1smPD5cIiddL2csIGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgcmV0dXJuIGh0bWxFc2NhcGVzW21hdGNoXTtcbiAgfSk7XG59O1xuXG51dGlscy5zb3J0QnkgPSBmdW5jdGlvbihvYmosIHZhbHVlLCBjb250ZXh0KSB7XG4gIHZhciBpdGVyYXRvciA9IHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJyA/IHZhbHVlIDogZnVuY3Rpb24ob2JqKXsgcmV0dXJuIG9ialt2YWx1ZV07IH07XG4gIHJldHVybiBvYmpcbiAgICAubWFwKGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBpbmRleDogaW5kZXgsXG4gICAgICAgIGNyaXRlcmlhOiBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdClcbiAgICAgIH07XG4gICAgfSlcbiAgICAuc29ydChmdW5jdGlvbihsZWZ0LCByaWdodCkge1xuICAgICAgdmFyIGEgPSBsZWZ0LmNyaXRlcmlhO1xuICAgICAgdmFyIGIgPSByaWdodC5jcml0ZXJpYTtcbiAgICAgIGlmIChhICE9PSBiKSB7XG4gICAgICAgIGlmIChhID4gYiB8fCBhID09PSB2b2lkIDApIHJldHVybiAxO1xuICAgICAgICBpZiAoYSA8IGIgfHwgYiA9PT0gdm9pZCAwKSByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICByZXR1cm4gbGVmdC5pbmRleCAtIHJpZ2h0LmluZGV4O1xuICAgIH0pXG4gICAgLm1hcChmdW5jdGlvbihpdGVtKSB7XG4gICAgICByZXR1cm4gaXRlbS52YWx1ZTtcbiAgICB9KTtcbn07XG5cbi8qKiBVc2VkIHRvIGdlbmVyYXRlIHVuaXF1ZSBJRHMgKi9cbnZhciBpZENvdW50ZXIgPSAwO1xuXG51dGlscy51bmlxdWVJZCA9IGZ1bmN0aW9uIHVuaXF1ZUlkKHByZWZpeCkge1xuICB2YXIgaWQgPSArK2lkQ291bnRlciArICcnO1xuICByZXR1cm4gcHJlZml4ID8gcHJlZml4ICsgaWQgOiBpZDtcbn07XG5cbnV0aWxzLmhhcyA9IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gIHJldHVybiBPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSk7XG59O1xuXG52YXIgZXEgPSBmdW5jdGlvbihhLCBiLCBhU3RhY2ssIGJTdGFjaykge1xuICAvLyBJZGVudGljYWwgb2JqZWN0cyBhcmUgZXF1YWwuIGAwID09PSAtMGAsIGJ1dCB0aGV5IGFyZW4ndCBpZGVudGljYWwuXG4gIC8vIFNlZSB0aGUgW0hhcm1vbnkgYGVnYWxgIHByb3Bvc2FsXShodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmVnYWwpLlxuICBpZiAoYSA9PT0gYikgcmV0dXJuIGEgIT09IDAgfHwgMSAvIGEgPT0gMSAvIGI7XG4gIC8vIEEgc3RyaWN0IGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5IGJlY2F1c2UgYG51bGwgPT0gdW5kZWZpbmVkYC5cbiAgaWYgKGEgPT0gbnVsbCB8fCBiID09IG51bGwpIHJldHVybiBhID09PSBiO1xuICAvLyBVbndyYXAgYW55IHdyYXBwZWQgb2JqZWN0cy5cbiAgLy9pZiAoYSBpbnN0YW5jZW9mIF8pIGEgPSBhLl93cmFwcGVkO1xuICAvL2lmIChiIGluc3RhbmNlb2YgXykgYiA9IGIuX3dyYXBwZWQ7XG4gIC8vIENvbXBhcmUgYFtbQ2xhc3NdXWAgbmFtZXMuXG4gIHZhciBjbGFzc05hbWUgPSB0b1N0cmluZy5jYWxsKGEpO1xuICBpZiAoY2xhc3NOYW1lICE9IHRvU3RyaW5nLmNhbGwoYikpIHJldHVybiBmYWxzZTtcbiAgc3dpdGNoIChjbGFzc05hbWUpIHtcbiAgICAvLyBTdHJpbmdzLCBudW1iZXJzLCBkYXRlcywgYW5kIGJvb2xlYW5zIGFyZSBjb21wYXJlZCBieSB2YWx1ZS5cbiAgICBjYXNlICdbb2JqZWN0IFN0cmluZ10nOlxuICAgICAgLy8gUHJpbWl0aXZlcyBhbmQgdGhlaXIgY29ycmVzcG9uZGluZyBvYmplY3Qgd3JhcHBlcnMgYXJlIGVxdWl2YWxlbnQ7IHRodXMsIGBcIjVcImAgaXNcbiAgICAgIC8vIGVxdWl2YWxlbnQgdG8gYG5ldyBTdHJpbmcoXCI1XCIpYC5cbiAgICAgIHJldHVybiBhID09IFN0cmluZyhiKTtcbiAgICBjYXNlICdbb2JqZWN0IE51bWJlcl0nOlxuICAgICAgLy8gYE5hTmBzIGFyZSBlcXVpdmFsZW50LCBidXQgbm9uLXJlZmxleGl2ZS4gQW4gYGVnYWxgIGNvbXBhcmlzb24gaXMgcGVyZm9ybWVkIGZvclxuICAgICAgLy8gb3RoZXIgbnVtZXJpYyB2YWx1ZXMuXG4gICAgICByZXR1cm4gYSAhPT0gK2EgPyBiICE9PSArYiA6IChhID09PSAwID8gMSAvIGEgPT09IDEgLyBiIDogYSA9PT0gK2IpO1xuICAgIGNhc2UgJ1tvYmplY3QgRGF0ZV0nOlxuICAgIGNhc2UgJ1tvYmplY3QgQm9vbGVhbl0nOlxuICAgICAgLy8gQ29lcmNlIGRhdGVzIGFuZCBib29sZWFucyB0byBudW1lcmljIHByaW1pdGl2ZSB2YWx1ZXMuIERhdGVzIGFyZSBjb21wYXJlZCBieSB0aGVpclxuICAgICAgLy8gbWlsbGlzZWNvbmQgcmVwcmVzZW50YXRpb25zLiBOb3RlIHRoYXQgaW52YWxpZCBkYXRlcyB3aXRoIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9uc1xuICAgICAgLy8gb2YgYE5hTmAgYXJlIG5vdCBlcXVpdmFsZW50LlxuICAgICAgcmV0dXJuICthID09ICtiO1xuICAgIC8vIFJlZ0V4cHMgYXJlIGNvbXBhcmVkIGJ5IHRoZWlyIHNvdXJjZSBwYXR0ZXJucyBhbmQgZmxhZ3MuXG4gICAgY2FzZSAnW29iamVjdCBSZWdFeHBdJzpcbiAgICAgIHJldHVybiBhLnNvdXJjZSA9PSBiLnNvdXJjZSAmJlxuICAgICAgICAgICAgIGEuZ2xvYmFsID09IGIuZ2xvYmFsICYmXG4gICAgICAgICAgICAgYS5tdWx0aWxpbmUgPT0gYi5tdWx0aWxpbmUgJiZcbiAgICAgICAgICAgICBhLmlnbm9yZUNhc2UgPT0gYi5pZ25vcmVDYXNlO1xuICB9XG4gIGlmICh0eXBlb2YgYSAhPSAnb2JqZWN0JyB8fCB0eXBlb2YgYiAhPSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuICAvLyBBc3N1bWUgZXF1YWxpdHkgZm9yIGN5Y2xpYyBzdHJ1Y3R1cmVzLiBUaGUgYWxnb3JpdGhtIGZvciBkZXRlY3RpbmcgY3ljbGljXG4gIC8vIHN0cnVjdHVyZXMgaXMgYWRhcHRlZCBmcm9tIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMsIGFic3RyYWN0IG9wZXJhdGlvbiBgSk9gLlxuICB2YXIgbGVuZ3RoID0gYVN0YWNrLmxlbmd0aDtcbiAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgLy8gTGluZWFyIHNlYXJjaC4gUGVyZm9ybWFuY2UgaXMgaW52ZXJzZWx5IHByb3BvcnRpb25hbCB0byB0aGUgbnVtYmVyIG9mXG4gICAgLy8gdW5pcXVlIG5lc3RlZCBzdHJ1Y3R1cmVzLlxuICAgIGlmIChhU3RhY2tbbGVuZ3RoXSA9PSBhKSByZXR1cm4gYlN0YWNrW2xlbmd0aF0gPT0gYjtcbiAgfVxuICAvLyBPYmplY3RzIHdpdGggZGlmZmVyZW50IGNvbnN0cnVjdG9ycyBhcmUgbm90IGVxdWl2YWxlbnQsIGJ1dCBgT2JqZWN0YHNcbiAgLy8gZnJvbSBkaWZmZXJlbnQgZnJhbWVzIGFyZS5cbiAgdmFyIGFDdG9yID0gYS5jb25zdHJ1Y3RvciwgYkN0b3IgPSBiLmNvbnN0cnVjdG9yO1xuICBpZiAoYUN0b3IgIT09IGJDdG9yICYmICEodHlwZW9mIGFDdG9yID09PSAnZnVuY3Rpb24nICYmIChhQ3RvciBpbnN0YW5jZW9mIGFDdG9yKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIGJDdG9yID09PSAnZnVuY3Rpb24nICYmIChiQ3RvciBpbnN0YW5jZW9mIGJDdG9yKSkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLy8gQWRkIHRoZSBmaXJzdCBvYmplY3QgdG8gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICBhU3RhY2sucHVzaChhKTtcbiAgYlN0YWNrLnB1c2goYik7XG4gIHZhciBzaXplID0gMCwgcmVzdWx0ID0gdHJ1ZTtcbiAgLy8gUmVjdXJzaXZlbHkgY29tcGFyZSBvYmplY3RzIGFuZCBhcnJheXMuXG4gIGlmIChjbGFzc05hbWUgPT09ICdbb2JqZWN0IEFycmF5XScpIHtcbiAgICAvLyBDb21wYXJlIGFycmF5IGxlbmd0aHMgdG8gZGV0ZXJtaW5lIGlmIGEgZGVlcCBjb21wYXJpc29uIGlzIG5lY2Vzc2FyeS5cbiAgICBzaXplID0gYS5sZW5ndGg7XG4gICAgcmVzdWx0ID0gc2l6ZSA9PT0gYi5sZW5ndGg7XG4gICAgaWYgKHJlc3VsdCkge1xuICAgICAgLy8gRGVlcCBjb21wYXJlIHRoZSBjb250ZW50cywgaWdub3Jpbmcgbm9uLW51bWVyaWMgcHJvcGVydGllcy5cbiAgICAgIHdoaWxlIChzaXplLS0pIHtcbiAgICAgICAgaWYgKCEocmVzdWx0ID0gZXEoYVtzaXplXSwgYltzaXplXSwgYVN0YWNrLCBiU3RhY2spKSkgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIERlZXAgY29tcGFyZSBvYmplY3RzLlxuICAgIGZvciAodmFyIGtleSBpbiBhKSB7XG4gICAgICBpZiAoXy5oYXMoYSwga2V5KSkge1xuICAgICAgICAvLyBDb3VudCB0aGUgZXhwZWN0ZWQgbnVtYmVyIG9mIHByb3BlcnRpZXMuXG4gICAgICAgIHNpemUrKztcbiAgICAgICAgLy8gRGVlcCBjb21wYXJlIGVhY2ggbWVtYmVyLlxuICAgICAgICBpZiAoIShyZXN1bHQgPSBfLmhhcyhiLCBrZXkpICYmIGVxKGFba2V5XSwgYltrZXldLCBhU3RhY2ssIGJTdGFjaykpKSBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gRW5zdXJlIHRoYXQgYm90aCBvYmplY3RzIGNvbnRhaW4gdGhlIHNhbWUgbnVtYmVyIG9mIHByb3BlcnRpZXMuXG4gICAgaWYgKHJlc3VsdCkge1xuICAgICAgZm9yIChrZXkgaW4gYikge1xuICAgICAgICBpZiAoXy5oYXMoYiwga2V5KSAmJiAhKHNpemUtLSkpIGJyZWFrO1xuICAgICAgfVxuICAgICAgcmVzdWx0ID0gIXNpemU7XG4gICAgfVxuICB9XG4gIC8vIFJlbW92ZSB0aGUgZmlyc3Qgb2JqZWN0IGZyb20gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICBhU3RhY2sucG9wKCk7XG4gIGJTdGFjay5wb3AoKTtcbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8vIFBlcmZvcm0gYSBkZWVwIGNvbXBhcmlzb24gdG8gY2hlY2sgaWYgdHdvIG9iamVjdHMgYXJlIGVxdWFsLlxudXRpbHMuaXNFcXVhbCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgcmV0dXJuIGVxKGEsIGIsIFtdLCBbXSk7XG59O1xuLy8gQmFja2JvbmUuRXZlbnRzXG4vLyAtLS0tLS0tLS0tLS0tLS1cblxuLy8gQSBtb2R1bGUgdGhhdCBjYW4gYmUgbWl4ZWQgaW4gdG8gKmFueSBvYmplY3QqIGluIG9yZGVyIHRvIHByb3ZpZGUgaXQgd2l0aFxuLy8gY3VzdG9tIGV2ZW50cy4gWW91IG1heSBiaW5kIHdpdGggYG9uYCBvciByZW1vdmUgd2l0aCBgb2ZmYCBjYWxsYmFja1xuLy8gZnVuY3Rpb25zIHRvIGFuIGV2ZW50OyBgdHJpZ2dlcmAtaW5nIGFuIGV2ZW50IGZpcmVzIGFsbCBjYWxsYmFja3MgaW5cbi8vIHN1Y2Nlc3Npb24uXG4vL1xuLy8gICAgIHZhciBvYmplY3QgPSB7fTtcbi8vICAgICBfLmV4dGVuZChvYmplY3QsIEJhY2tib25lLkV2ZW50cyk7XG4vLyAgICAgb2JqZWN0Lm9uKCdleHBhbmQnLCBmdW5jdGlvbigpeyBhbGVydCgnZXhwYW5kZWQnKTsgfSk7XG4vLyAgICAgb2JqZWN0LnRyaWdnZXIoJ2V4cGFuZCcpO1xuLy9cbnZhciBFdmVudHMgPSBCYWNrYm9uZS5FdmVudHMgPSB7XG5cbiAgLy8gQmluZCBhbiBldmVudCB0byBhIGBjYWxsYmFja2AgZnVuY3Rpb24uIFBhc3NpbmcgYFwiYWxsXCJgIHdpbGwgYmluZFxuICAvLyB0aGUgY2FsbGJhY2sgdG8gYWxsIGV2ZW50cyBmaXJlZC5cbiAgb246IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgaWYgKCFldmVudHNBcGkodGhpcywgJ29uJywgbmFtZSwgW2NhbGxiYWNrLCBjb250ZXh0XSkgfHwgIWNhbGxiYWNrKSByZXR1cm4gdGhpcztcbiAgICB0aGlzLl9ldmVudHMgfHwgKHRoaXMuX2V2ZW50cyA9IHt9KTtcbiAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdIHx8ICh0aGlzLl9ldmVudHNbbmFtZV0gPSBbXSk7XG4gICAgZXZlbnRzLnB1c2goe2NhbGxiYWNrOiBjYWxsYmFjaywgY29udGV4dDogY29udGV4dCwgY3R4OiBjb250ZXh0IHx8IHRoaXN9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvLyBCaW5kIGFuIGV2ZW50IHRvIG9ubHkgYmUgdHJpZ2dlcmVkIGEgc2luZ2xlIHRpbWUuIEFmdGVyIHRoZSBmaXJzdCB0aW1lXG4gIC8vIHRoZSBjYWxsYmFjayBpcyBpbnZva2VkLCBpdCB3aWxsIGJlIHJlbW92ZWQuXG4gIG9uY2U6IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgaWYgKCFldmVudHNBcGkodGhpcywgJ29uY2UnLCBuYW1lLCBbY2FsbGJhY2ssIGNvbnRleHRdKSB8fCAhY2FsbGJhY2spIHJldHVybiB0aGlzO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcmFuO1xuICAgIHZhciBvbmNlID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAocmFuKSByZXR1cm47XG4gICAgICByYW4gPSB0cnVlO1xuICAgICAgc2VsZi5vZmYobmFtZSwgb25jZSk7XG4gICAgICBjYWxsYmFjay5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gICAgb25jZS5fY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICByZXR1cm4gdGhpcy5vbihuYW1lLCBvbmNlLCBjb250ZXh0KTtcbiAgfSxcblxuICAvLyBSZW1vdmUgb25lIG9yIG1hbnkgY2FsbGJhY2tzLiBJZiBgY29udGV4dGAgaXMgbnVsbCwgcmVtb3ZlcyBhbGxcbiAgLy8gY2FsbGJhY2tzIHdpdGggdGhhdCBmdW5jdGlvbi4gSWYgYGNhbGxiYWNrYCBpcyBudWxsLCByZW1vdmVzIGFsbFxuICAvLyBjYWxsYmFja3MgZm9yIHRoZSBldmVudC4gSWYgYG5hbWVgIGlzIG51bGwsIHJlbW92ZXMgYWxsIGJvdW5kXG4gIC8vIGNhbGxiYWNrcyBmb3IgYWxsIGV2ZW50cy5cbiAgb2ZmOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgIHZhciByZXRhaW4sIGV2LCBldmVudHMsIG5hbWVzLCBpLCBsLCBqLCBrO1xuICAgIGlmICghdGhpcy5fZXZlbnRzIHx8ICFldmVudHNBcGkodGhpcywgJ29mZicsIG5hbWUsIFtjYWxsYmFjaywgY29udGV4dF0pKSByZXR1cm4gdGhpcztcbiAgICBpZiAoIW5hbWUgJiYgIWNhbGxiYWNrICYmICFjb250ZXh0KSB7XG4gICAgICB0aGlzLl9ldmVudHMgPSB2b2lkIDA7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgbmFtZXMgPSBuYW1lID8gW25hbWVdIDogT2JqZWN0LmtleXModGhpcy5fZXZlbnRzKTtcbiAgICBmb3IgKGkgPSAwLCBsID0gbmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBuYW1lID0gbmFtZXNbaV07XG4gICAgICBpZiAoZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdKSB7XG4gICAgICAgIHRoaXMuX2V2ZW50c1tuYW1lXSA9IHJldGFpbiA9IFtdO1xuICAgICAgICBpZiAoY2FsbGJhY2sgfHwgY29udGV4dCkge1xuICAgICAgICAgIGZvciAoaiA9IDAsIGsgPSBldmVudHMubGVuZ3RoOyBqIDwgazsgaisrKSB7XG4gICAgICAgICAgICBldiA9IGV2ZW50c1tqXTtcbiAgICAgICAgICAgIGlmICgoY2FsbGJhY2sgJiYgY2FsbGJhY2sgIT09IGV2LmNhbGxiYWNrICYmIGNhbGxiYWNrICE9PSBldi5jYWxsYmFjay5fY2FsbGJhY2spIHx8XG4gICAgICAgICAgICAgICAgKGNvbnRleHQgJiYgY29udGV4dCAhPT0gZXYuY29udGV4dCkpIHtcbiAgICAgICAgICAgICAgcmV0YWluLnB1c2goZXYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIXJldGFpbi5sZW5ndGgpIGRlbGV0ZSB0aGlzLl9ldmVudHNbbmFtZV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLy8gVHJpZ2dlciBvbmUgb3IgbWFueSBldmVudHMsIGZpcmluZyBhbGwgYm91bmQgY2FsbGJhY2tzLiBDYWxsYmFja3MgYXJlXG4gIC8vIHBhc3NlZCB0aGUgc2FtZSBhcmd1bWVudHMgYXMgYHRyaWdnZXJgIGlzLCBhcGFydCBmcm9tIHRoZSBldmVudCBuYW1lXG4gIC8vICh1bmxlc3MgeW91J3JlIGxpc3RlbmluZyBvbiBgXCJhbGxcImAsIHdoaWNoIHdpbGwgY2F1c2UgeW91ciBjYWxsYmFjayB0b1xuICAvLyByZWNlaXZlIHRoZSB0cnVlIG5hbWUgb2YgdGhlIGV2ZW50IGFzIHRoZSBmaXJzdCBhcmd1bWVudCkuXG4gIHRyaWdnZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cykgcmV0dXJuIHRoaXM7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgaWYgKCFldmVudHNBcGkodGhpcywgJ3RyaWdnZXInLCBuYW1lLCBhcmdzKSkgcmV0dXJuIHRoaXM7XG4gICAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXTtcbiAgICB2YXIgYWxsRXZlbnRzID0gdGhpcy5fZXZlbnRzLmFsbDtcbiAgICBpZiAoZXZlbnRzKSB0cmlnZ2VyRXZlbnRzKGV2ZW50cywgYXJncyk7XG4gICAgaWYgKGFsbEV2ZW50cykgdHJpZ2dlckV2ZW50cyhhbGxFdmVudHMsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLy8gVGVsbCB0aGlzIG9iamVjdCB0byBzdG9wIGxpc3RlbmluZyB0byBlaXRoZXIgc3BlY2lmaWMgZXZlbnRzIC4uLiBvclxuICAvLyB0byBldmVyeSBvYmplY3QgaXQncyBjdXJyZW50bHkgbGlzdGVuaW5nIHRvLlxuICBzdG9wTGlzdGVuaW5nOiBmdW5jdGlvbihvYmosIG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGxpc3RlbmluZ1RvID0gdGhpcy5fbGlzdGVuaW5nVG87XG4gICAgaWYgKCFsaXN0ZW5pbmdUbykgcmV0dXJuIHRoaXM7XG4gICAgdmFyIHJlbW92ZSA9ICFuYW1lICYmICFjYWxsYmFjaztcbiAgICBpZiAoIWNhbGxiYWNrICYmIHR5cGVvZiBuYW1lID09PSAnb2JqZWN0JykgY2FsbGJhY2sgPSB0aGlzO1xuICAgIGlmIChvYmopIChsaXN0ZW5pbmdUbyA9IHt9KVtvYmouX2xpc3RlbklkXSA9IG9iajtcbiAgICBmb3IgKHZhciBpZCBpbiBsaXN0ZW5pbmdUbykge1xuICAgICAgb2JqID0gbGlzdGVuaW5nVG9baWRdO1xuICAgICAgb2JqLm9mZihuYW1lLCBjYWxsYmFjaywgdGhpcyk7XG4gICAgICBpZiAocmVtb3ZlIHx8ICFPYmplY3Qua2V5cyhvYmouX2V2ZW50cykubGVuZ3RoKSBkZWxldGUgdGhpcy5fbGlzdGVuaW5nVG9baWRdO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG59O1xuXG4vLyBSZWd1bGFyIGV4cHJlc3Npb24gdXNlZCB0byBzcGxpdCBldmVudCBzdHJpbmdzLlxudmFyIGV2ZW50U3BsaXR0ZXIgPSAvXFxzKy87XG5cbi8vIEltcGxlbWVudCBmYW5jeSBmZWF0dXJlcyBvZiB0aGUgRXZlbnRzIEFQSSBzdWNoIGFzIG11bHRpcGxlIGV2ZW50XG4vLyBuYW1lcyBgXCJjaGFuZ2UgYmx1clwiYCBhbmQgalF1ZXJ5LXN0eWxlIGV2ZW50IG1hcHMgYHtjaGFuZ2U6IGFjdGlvbn1gXG4vLyBpbiB0ZXJtcyBvZiB0aGUgZXhpc3RpbmcgQVBJLlxudmFyIGV2ZW50c0FwaSA9IGZ1bmN0aW9uKG9iaiwgYWN0aW9uLCBuYW1lLCByZXN0KSB7XG4gIGlmICghbmFtZSkgcmV0dXJuIHRydWU7XG5cbiAgLy8gSGFuZGxlIGV2ZW50IG1hcHMuXG4gIGlmICh0eXBlb2YgbmFtZSA9PT0gJ29iamVjdCcpIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gbmFtZSkge1xuICAgICAgb2JqW2FjdGlvbl0uYXBwbHkob2JqLCBba2V5LCBuYW1lW2tleV1dLmNvbmNhdChyZXN0KSk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIEhhbmRsZSBzcGFjZSBzZXBhcmF0ZWQgZXZlbnQgbmFtZXMuXG4gIGlmIChldmVudFNwbGl0dGVyLnRlc3QobmFtZSkpIHtcbiAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KGV2ZW50U3BsaXR0ZXIpO1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gbmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBvYmpbYWN0aW9uXS5hcHBseShvYmosIFtuYW1lc1tpXV0uY29uY2F0KHJlc3QpKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vLyBBIGRpZmZpY3VsdC10by1iZWxpZXZlLCBidXQgb3B0aW1pemVkIGludGVybmFsIGRpc3BhdGNoIGZ1bmN0aW9uIGZvclxuLy8gdHJpZ2dlcmluZyBldmVudHMuIFRyaWVzIHRvIGtlZXAgdGhlIHVzdWFsIGNhc2VzIHNwZWVkeSAobW9zdCBpbnRlcm5hbFxuLy8gQmFja2JvbmUgZXZlbnRzIGhhdmUgMyBhcmd1bWVudHMpLlxudmFyIHRyaWdnZXJFdmVudHMgPSBmdW5jdGlvbihldmVudHMsIGFyZ3MpIHtcbiAgdmFyIGV2LCBpID0gLTEsIGwgPSBldmVudHMubGVuZ3RoLCBhMSA9IGFyZ3NbMF0sIGEyID0gYXJnc1sxXSwgYTMgPSBhcmdzWzJdO1xuICBzd2l0Y2ggKGFyZ3MubGVuZ3RoKSB7XG4gICAgY2FzZSAwOiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5jYWxsKGV2LmN0eCk7IHJldHVybjtcbiAgICBjYXNlIDE6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSk7IHJldHVybjtcbiAgICBjYXNlIDI6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSwgYTIpOyByZXR1cm47XG4gICAgY2FzZSAzOiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5jYWxsKGV2LmN0eCwgYTEsIGEyLCBhMyk7IHJldHVybjtcbiAgICBkZWZhdWx0OiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5hcHBseShldi5jdHgsIGFyZ3MpOyByZXR1cm47XG4gIH1cbn07XG5cbnZhciBsaXN0ZW5NZXRob2RzID0ge2xpc3RlblRvOiAnb24nLCBsaXN0ZW5Ub09uY2U6ICdvbmNlJ307XG5cbi8vIEludmVyc2lvbi1vZi1jb250cm9sIHZlcnNpb25zIG9mIGBvbmAgYW5kIGBvbmNlYC4gVGVsbCAqdGhpcyogb2JqZWN0IHRvXG4vLyBsaXN0ZW4gdG8gYW4gZXZlbnQgaW4gYW5vdGhlciBvYmplY3QgLi4uIGtlZXBpbmcgdHJhY2sgb2Ygd2hhdCBpdCdzXG4vLyBsaXN0ZW5pbmcgdG8uXG5PYmplY3Qua2V5cyhsaXN0ZW5NZXRob2RzKS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZCkge1xuICB2YXIgaW1wbGVtZW50YXRpb24gPSBsaXN0ZW5NZXRob2RzW21ldGhvZF07XG4gIEV2ZW50c1ttZXRob2RdID0gZnVuY3Rpb24ob2JqLCBuYW1lLCBjYWxsYmFjaykge1xuICAgIHZhciBsaXN0ZW5pbmdUbyA9IHRoaXMuX2xpc3RlbmluZ1RvIHx8ICh0aGlzLl9saXN0ZW5pbmdUbyA9IHt9KTtcbiAgICB2YXIgaWQgPSBvYmouX2xpc3RlbklkIHx8IChvYmouX2xpc3RlbklkID0gXy51bmlxdWVJZCgnbCcpKTtcbiAgICBsaXN0ZW5pbmdUb1tpZF0gPSBvYmo7XG4gICAgaWYgKCFjYWxsYmFjayAmJiB0eXBlb2YgbmFtZSA9PT0gJ29iamVjdCcpIGNhbGxiYWNrID0gdGhpcztcbiAgICBvYmpbaW1wbGVtZW50YXRpb25dKG5hbWUsIGNhbGxiYWNrLCB0aGlzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcbn0pO1xuXG4vLyBBbGlhc2VzIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5cbkV2ZW50cy5iaW5kICAgPSBFdmVudHMub247XG5FdmVudHMudW5iaW5kID0gRXZlbnRzLm9mZjtcblxuLy8gQWxsb3cgdGhlIGBCYWNrYm9uZWAgb2JqZWN0IHRvIHNlcnZlIGFzIGEgZ2xvYmFsIGV2ZW50IGJ1cywgZm9yIGZvbGtzIHdob1xuLy8gd2FudCBnbG9iYWwgXCJwdWJzdWJcIiBpbiBhIGNvbnZlbmllbnQgcGxhY2UuXG5fLmV4dGVuZChCYWNrYm9uZSwgRXZlbnRzKTtcbi8vIEJhY2tib25lLk1vZGVsXG4vLyAtLS0tLS0tLS0tLS0tLVxuXG4vLyBCYWNrYm9uZSAqKk1vZGVscyoqIGFyZSB0aGUgYmFzaWMgZGF0YSBvYmplY3QgaW4gdGhlIGZyYW1ld29yayAtLVxuLy8gZnJlcXVlbnRseSByZXByZXNlbnRpbmcgYSByb3cgaW4gYSB0YWJsZSBpbiBhIGRhdGFiYXNlIG9uIHlvdXIgc2VydmVyLlxuLy8gQSBkaXNjcmV0ZSBjaHVuayBvZiBkYXRhIGFuZCBhIGJ1bmNoIG9mIHVzZWZ1bCwgcmVsYXRlZCBtZXRob2RzIGZvclxuLy8gcGVyZm9ybWluZyBjb21wdXRhdGlvbnMgYW5kIHRyYW5zZm9ybWF0aW9ucyBvbiB0aGF0IGRhdGEuXG5cbi8vIENyZWF0ZSBhIG5ldyBtb2RlbCB3aXRoIHRoZSBzcGVjaWZpZWQgYXR0cmlidXRlcy4gQSBjbGllbnQgaWQgKGBjaWRgKVxuLy8gaXMgYXV0b21hdGljYWxseSBnZW5lcmF0ZWQgYW5kIGFzc2lnbmVkIGZvciB5b3UuXG52YXIgTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbCA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMsIG9wdGlvbnMpIHtcbiAgdmFyIGF0dHJzID0gYXR0cmlidXRlcyB8fCB7fTtcbiAgb3B0aW9ucyB8fCAob3B0aW9ucyA9IHt9KTtcbiAgdGhpcy5jaWQgPSBfLnVuaXF1ZUlkKCdjJyk7XG4gIHRoaXMuYXR0cmlidXRlcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIGlmIChvcHRpb25zLmNvbGxlY3Rpb24pIHRoaXMuY29sbGVjdGlvbiA9IG9wdGlvbnMuY29sbGVjdGlvbjtcbiAgaWYgKG9wdGlvbnMucGFyc2UpIGF0dHJzID0gdGhpcy5wYXJzZShhdHRycywgb3B0aW9ucykgfHwge307XG4gIGF0dHJzID0gXy5kZWZhdWx0cyh7fSwgYXR0cnMsIF8ucmVzdWx0KHRoaXMsICdkZWZhdWx0cycpKTtcbiAgdGhpcy5zZXQoYXR0cnMsIG9wdGlvbnMpO1xuICB0aGlzLmNoYW5nZWQgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB0aGlzLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbi8vIEF0dGFjaCBhbGwgaW5oZXJpdGFibGUgbWV0aG9kcyB0byB0aGUgTW9kZWwgcHJvdG90eXBlLlxuXy5leHRlbmQoTW9kZWwucHJvdG90eXBlLCBFdmVudHMsIHtcblxuICAvLyBBIGhhc2ggb2YgYXR0cmlidXRlcyB3aG9zZSBjdXJyZW50IGFuZCBwcmV2aW91cyB2YWx1ZSBkaWZmZXIuXG4gIGNoYW5nZWQ6IG51bGwsXG5cbiAgLy8gVGhlIHZhbHVlIHJldHVybmVkIGR1cmluZyB0aGUgbGFzdCBmYWlsZWQgdmFsaWRhdGlvbi5cbiAgdmFsaWRhdGlvbkVycm9yOiBudWxsLFxuXG4gIC8vIFRoZSBkZWZhdWx0IG5hbWUgZm9yIHRoZSBKU09OIGBpZGAgYXR0cmlidXRlIGlzIGBcImlkXCJgLiBNb25nb0RCIGFuZFxuICAvLyBDb3VjaERCIHVzZXJzIG1heSB3YW50IHRvIHNldCB0aGlzIHRvIGBcIl9pZFwiYC5cbiAgaWRBdHRyaWJ1dGU6ICdpZCcsXG5cbiAgLy8gSW5pdGlhbGl6ZSBpcyBhbiBlbXB0eSBmdW5jdGlvbiBieSBkZWZhdWx0LiBPdmVycmlkZSBpdCB3aXRoIHlvdXIgb3duXG4gIC8vIGluaXRpYWxpemF0aW9uIGxvZ2ljLlxuICBpbml0aWFsaXplOiBmdW5jdGlvbigpe30sXG5cbiAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgbW9kZWwncyBgYXR0cmlidXRlc2Agb2JqZWN0LlxuICB0b0pTT046IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gXy5leHRlbmQoe30sIHRoaXMuYXR0cmlidXRlcyk7XG4gIH0sXG5cbiAgLy8gUHJveHkgYEJhY2tib25lLnN5bmNgIGJ5IGRlZmF1bHQgLS0gYnV0IG92ZXJyaWRlIHRoaXMgaWYgeW91IG5lZWRcbiAgLy8gY3VzdG9tIHN5bmNpbmcgc2VtYW50aWNzIGZvciAqdGhpcyogcGFydGljdWxhciBtb2RlbC5cbiAgc3luYzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIEJhY2tib25lLnN5bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfSxcblxuICAvLyBHZXQgdGhlIHZhbHVlIG9mIGFuIGF0dHJpYnV0ZS5cbiAgZ2V0OiBmdW5jdGlvbihhdHRyKSB7XG4gICAgcmV0dXJuIHRoaXMuYXR0cmlidXRlc1thdHRyXTtcbiAgfSxcblxuICAvLyBHZXQgdGhlIEhUTUwtZXNjYXBlZCB2YWx1ZSBvZiBhbiBhdHRyaWJ1dGUuXG4gIGVzY2FwZTogZnVuY3Rpb24oYXR0cikge1xuICAgIHJldHVybiBfLmVzY2FwZSh0aGlzLmdldChhdHRyKSk7XG4gIH0sXG5cbiAgLy8gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGF0dHJpYnV0ZSBjb250YWlucyBhIHZhbHVlIHRoYXQgaXMgbm90IG51bGxcbiAgLy8gb3IgdW5kZWZpbmVkLlxuICBoYXM6IGZ1bmN0aW9uKGF0dHIpIHtcbiAgICByZXR1cm4gdGhpcy5nZXQoYXR0cikgIT0gbnVsbDtcbiAgfSxcblxuICAvLyBTZXQgYSBoYXNoIG9mIG1vZGVsIGF0dHJpYnV0ZXMgb24gdGhlIG9iamVjdCwgZmlyaW5nIGBcImNoYW5nZVwiYC4gVGhpcyBpc1xuICAvLyB0aGUgY29yZSBwcmltaXRpdmUgb3BlcmF0aW9uIG9mIGEgbW9kZWwsIHVwZGF0aW5nIHRoZSBkYXRhIGFuZCBub3RpZnlpbmdcbiAgLy8gYW55b25lIHdobyBuZWVkcyB0byBrbm93IGFib3V0IHRoZSBjaGFuZ2UgaW4gc3RhdGUuIFRoZSBoZWFydCBvZiB0aGUgYmVhc3QuXG4gIHNldDogZnVuY3Rpb24oa2V5LCB2YWwsIG9wdGlvbnMpIHtcbiAgICB2YXIgYXR0ciwgYXR0cnMsIHVuc2V0LCBjaGFuZ2VzLCBzaWxlbnQsIGNoYW5naW5nLCBwcmV2LCBjdXJyZW50O1xuICAgIGlmIChrZXkgPT0gbnVsbCkgcmV0dXJuIHRoaXM7XG5cbiAgICAvLyBIYW5kbGUgYm90aCBgXCJrZXlcIiwgdmFsdWVgIGFuZCBge2tleTogdmFsdWV9YCAtc3R5bGUgYXJndW1lbnRzLlxuICAgIGlmICh0eXBlb2Yga2V5ID09PSAnb2JqZWN0Jykge1xuICAgICAgYXR0cnMgPSBrZXk7XG4gICAgICBvcHRpb25zID0gdmFsO1xuICAgIH0gZWxzZSB7XG4gICAgICAoYXR0cnMgPSB7fSlba2V5XSA9IHZhbDtcbiAgICB9XG5cbiAgICBvcHRpb25zIHx8IChvcHRpb25zID0ge30pO1xuXG4gICAgLy8gUnVuIHZhbGlkYXRpb24uXG4gICAgaWYgKCF0aGlzLl92YWxpZGF0ZShhdHRycywgb3B0aW9ucykpIHJldHVybiBmYWxzZTtcblxuICAgIC8vIEV4dHJhY3QgYXR0cmlidXRlcyBhbmQgb3B0aW9ucy5cbiAgICB1bnNldCAgICAgICAgICAgPSBvcHRpb25zLnVuc2V0O1xuICAgIHNpbGVudCAgICAgICAgICA9IG9wdGlvbnMuc2lsZW50O1xuICAgIGNoYW5nZXMgICAgICAgICA9IFtdO1xuICAgIGNoYW5naW5nICAgICAgICA9IHRoaXMuX2NoYW5naW5nO1xuICAgIHRoaXMuX2NoYW5naW5nICA9IHRydWU7XG5cbiAgICBpZiAoIWNoYW5naW5nKSB7XG4gICAgICB0aGlzLl9wcmV2aW91c0F0dHJpYnV0ZXMgPSBfLmV4dGVuZChPYmplY3QuY3JlYXRlKG51bGwpLCB0aGlzLmF0dHJpYnV0ZXMpO1xuICAgICAgdGhpcy5jaGFuZ2VkID0ge307XG4gICAgfVxuICAgIGN1cnJlbnQgPSB0aGlzLmF0dHJpYnV0ZXMsIHByZXYgPSB0aGlzLl9wcmV2aW91c0F0dHJpYnV0ZXM7XG5cbiAgICAvLyBDaGVjayBmb3IgY2hhbmdlcyBvZiBgaWRgLlxuICAgIGlmICh0aGlzLmlkQXR0cmlidXRlIGluIGF0dHJzKSB0aGlzLmlkID0gYXR0cnNbdGhpcy5pZEF0dHJpYnV0ZV07XG5cbiAgICAvLyBGb3IgZWFjaCBgc2V0YCBhdHRyaWJ1dGUsIHVwZGF0ZSBvciBkZWxldGUgdGhlIGN1cnJlbnQgdmFsdWUuXG4gICAgZm9yIChhdHRyIGluIGF0dHJzKSB7XG4gICAgICB2YWwgPSBhdHRyc1thdHRyXTtcbiAgICAgIGlmICghXy5pc0VxdWFsKGN1cnJlbnRbYXR0cl0sIHZhbCkpIGNoYW5nZXMucHVzaChhdHRyKTtcbiAgICAgIGlmICghXy5pc0VxdWFsKHByZXZbYXR0cl0sIHZhbCkpIHtcbiAgICAgICAgdGhpcy5jaGFuZ2VkW2F0dHJdID0gdmFsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuY2hhbmdlZFthdHRyXTtcbiAgICAgIH1cbiAgICAgIHVuc2V0ID8gZGVsZXRlIGN1cnJlbnRbYXR0cl0gOiBjdXJyZW50W2F0dHJdID0gdmFsO1xuICAgIH1cblxuICAgIC8vIFRyaWdnZXIgYWxsIHJlbGV2YW50IGF0dHJpYnV0ZSBjaGFuZ2VzLlxuICAgIGlmICghc2lsZW50KSB7XG4gICAgICBpZiAoY2hhbmdlcy5sZW5ndGgpIHRoaXMuX3BlbmRpbmcgPSBvcHRpb25zO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBjaGFuZ2VzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZTonICsgY2hhbmdlc1tpXSwgdGhpcywgY3VycmVudFtjaGFuZ2VzW2ldXSwgb3B0aW9ucyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gWW91IG1pZ2h0IGJlIHdvbmRlcmluZyB3aHkgdGhlcmUncyBhIGB3aGlsZWAgbG9vcCBoZXJlLiBDaGFuZ2VzIGNhblxuICAgIC8vIGJlIHJlY3Vyc2l2ZWx5IG5lc3RlZCB3aXRoaW4gYFwiY2hhbmdlXCJgIGV2ZW50cy5cbiAgICBpZiAoY2hhbmdpbmcpIHJldHVybiB0aGlzO1xuICAgIGlmICghc2lsZW50KSB7XG4gICAgICB3aGlsZSAodGhpcy5fcGVuZGluZykge1xuICAgICAgICBvcHRpb25zID0gdGhpcy5fcGVuZGluZztcbiAgICAgICAgdGhpcy5fcGVuZGluZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScsIHRoaXMsIG9wdGlvbnMpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9wZW5kaW5nID0gZmFsc2U7XG4gICAgdGhpcy5fY2hhbmdpbmcgPSBmYWxzZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvLyBSZW1vdmUgYW4gYXR0cmlidXRlIGZyb20gdGhlIG1vZGVsLCBmaXJpbmcgYFwiY2hhbmdlXCJgLiBgdW5zZXRgIGlzIGEgbm9vcFxuICAvLyBpZiB0aGUgYXR0cmlidXRlIGRvZXNuJ3QgZXhpc3QuXG4gIHVuc2V0OiBmdW5jdGlvbihhdHRyLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIHRoaXMuc2V0KGF0dHIsIHZvaWQgMCwgXy5leHRlbmQoe30sIG9wdGlvbnMsIHt1bnNldDogdHJ1ZX0pKTtcbiAgfSxcblxuICAvLyBDbGVhciBhbGwgYXR0cmlidXRlcyBvbiB0aGUgbW9kZWwsIGZpcmluZyBgXCJjaGFuZ2VcImAuXG4gIGNsZWFyOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdmFyIGF0dHJzID0ge307XG4gICAgZm9yICh2YXIga2V5IGluIHRoaXMuYXR0cmlidXRlcykgYXR0cnNba2V5XSA9IHZvaWQgMDtcbiAgICByZXR1cm4gdGhpcy5zZXQoYXR0cnMsIF8uZXh0ZW5kKHt9LCBvcHRpb25zLCB7dW5zZXQ6IHRydWV9KSk7XG4gIH0sXG5cbiAgLy8gRGV0ZXJtaW5lIGlmIHRoZSBtb2RlbCBoYXMgY2hhbmdlZCBzaW5jZSB0aGUgbGFzdCBgXCJjaGFuZ2VcImAgZXZlbnQuXG4gIC8vIElmIHlvdSBzcGVjaWZ5IGFuIGF0dHJpYnV0ZSBuYW1lLCBkZXRlcm1pbmUgaWYgdGhhdCBhdHRyaWJ1dGUgaGFzIGNoYW5nZWQuXG4gIGhhc0NoYW5nZWQ6IGZ1bmN0aW9uKGF0dHIpIHtcbiAgICBpZiAoYXR0ciA9PSBudWxsKSByZXR1cm4gISFPYmplY3Qua2V5cyh0aGlzLmNoYW5nZWQpLmxlbmd0aDtcbiAgICByZXR1cm4gXy5oYXModGhpcy5jaGFuZ2VkLCBhdHRyKTtcbiAgfSxcblxuICAvLyBSZXR1cm4gYW4gb2JqZWN0IGNvbnRhaW5pbmcgYWxsIHRoZSBhdHRyaWJ1dGVzIHRoYXQgaGF2ZSBjaGFuZ2VkLCBvclxuICAvLyBmYWxzZSBpZiB0aGVyZSBhcmUgbm8gY2hhbmdlZCBhdHRyaWJ1dGVzLiBVc2VmdWwgZm9yIGRldGVybWluaW5nIHdoYXRcbiAgLy8gcGFydHMgb2YgYSB2aWV3IG5lZWQgdG8gYmUgdXBkYXRlZCBhbmQvb3Igd2hhdCBhdHRyaWJ1dGVzIG5lZWQgdG8gYmVcbiAgLy8gcGVyc2lzdGVkIHRvIHRoZSBzZXJ2ZXIuIFVuc2V0IGF0dHJpYnV0ZXMgd2lsbCBiZSBzZXQgdG8gdW5kZWZpbmVkLlxuICAvLyBZb3UgY2FuIGFsc28gcGFzcyBhbiBhdHRyaWJ1dGVzIG9iamVjdCB0byBkaWZmIGFnYWluc3QgdGhlIG1vZGVsLFxuICAvLyBkZXRlcm1pbmluZyBpZiB0aGVyZSAqd291bGQgYmUqIGEgY2hhbmdlLlxuICBjaGFuZ2VkQXR0cmlidXRlczogZnVuY3Rpb24oZGlmZikge1xuICAgIGlmICghZGlmZikgcmV0dXJuIHRoaXMuaGFzQ2hhbmdlZCgpID8gXy5leHRlbmQoT2JqZWN0LmNyZWF0ZShudWxsKSwgdGhpcy5jaGFuZ2VkKSA6IGZhbHNlO1xuICAgIHZhciB2YWwsIGNoYW5nZWQgPSBmYWxzZTtcbiAgICB2YXIgb2xkID0gdGhpcy5fY2hhbmdpbmcgPyB0aGlzLl9wcmV2aW91c0F0dHJpYnV0ZXMgOiB0aGlzLmF0dHJpYnV0ZXM7XG4gICAgZm9yICh2YXIgYXR0ciBpbiBkaWZmKSB7XG4gICAgICBpZiAoXy5pc0VxdWFsKG9sZFthdHRyXSwgKHZhbCA9IGRpZmZbYXR0cl0pKSkgY29udGludWU7XG4gICAgICAoY2hhbmdlZCB8fCAoY2hhbmdlZCA9IHt9KSlbYXR0cl0gPSB2YWw7XG4gICAgfVxuICAgIHJldHVybiBjaGFuZ2VkO1xuICB9LFxuXG4gIC8vIEdldCB0aGUgcHJldmlvdXMgdmFsdWUgb2YgYW4gYXR0cmlidXRlLCByZWNvcmRlZCBhdCB0aGUgdGltZSB0aGUgbGFzdFxuICAvLyBgXCJjaGFuZ2VcImAgZXZlbnQgd2FzIGZpcmVkLlxuICBwcmV2aW91czogZnVuY3Rpb24oYXR0cikge1xuICAgIGlmIChhdHRyID09IG51bGwgfHwgIXRoaXMuX3ByZXZpb3VzQXR0cmlidXRlcykgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHRoaXMuX3ByZXZpb3VzQXR0cmlidXRlc1thdHRyXTtcbiAgfSxcblxuICAvLyBHZXQgYWxsIG9mIHRoZSBhdHRyaWJ1dGVzIG9mIHRoZSBtb2RlbCBhdCB0aGUgdGltZSBvZiB0aGUgcHJldmlvdXNcbiAgLy8gYFwiY2hhbmdlXCJgIGV2ZW50LlxuICBwcmV2aW91c0F0dHJpYnV0ZXM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLmV4dGVuZChPYmplY3QuY3JlYXRlKG51bGwpLCB0aGlzLl9wcmV2aW91c0F0dHJpYnV0ZXMpO1xuICB9LFxuXG4gIC8vIEZldGNoIHRoZSBtb2RlbCBmcm9tIHRoZSBzZXJ2ZXIuIElmIHRoZSBzZXJ2ZXIncyByZXByZXNlbnRhdGlvbiBvZiB0aGVcbiAgLy8gbW9kZWwgZGlmZmVycyBmcm9tIGl0cyBjdXJyZW50IGF0dHJpYnV0ZXMsIHRoZXkgd2lsbCBiZSBvdmVycmlkZGVuLFxuICAvLyB0cmlnZ2VyaW5nIGEgYFwiY2hhbmdlXCJgIGV2ZW50LlxuICBmZXRjaDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zID8gXy5leHRlbmQoe30sIG9wdGlvbnMpIDoge307XG4gICAgaWYgKG9wdGlvbnMucGFyc2UgPT09IHZvaWQgMCkgb3B0aW9ucy5wYXJzZSA9IHRydWU7XG4gICAgdmFyIG1vZGVsID0gdGhpcztcbiAgICB2YXIgc3VjY2VzcyA9IG9wdGlvbnMuc3VjY2VzcztcbiAgICBvcHRpb25zLnN1Y2Nlc3MgPSBmdW5jdGlvbihyZXNwKSB7XG4gICAgICBpZiAoIW1vZGVsLnNldChtb2RlbC5wYXJzZShyZXNwLCBvcHRpb25zKSwgb3B0aW9ucykpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmIChzdWNjZXNzKSBzdWNjZXNzKG1vZGVsLCByZXNwLCBvcHRpb25zKTtcbiAgICAgIG1vZGVsLnRyaWdnZXIoJ3N5bmMnLCBtb2RlbCwgcmVzcCwgb3B0aW9ucyk7XG4gICAgfTtcbiAgICB3cmFwRXJyb3IodGhpcywgb3B0aW9ucyk7XG4gICAgcmV0dXJuIHRoaXMuc3luYygncmVhZCcsIHRoaXMsIG9wdGlvbnMpO1xuICB9LFxuXG4gIC8vIFNldCBhIGhhc2ggb2YgbW9kZWwgYXR0cmlidXRlcywgYW5kIHN5bmMgdGhlIG1vZGVsIHRvIHRoZSBzZXJ2ZXIuXG4gIC8vIElmIHRoZSBzZXJ2ZXIgcmV0dXJucyBhbiBhdHRyaWJ1dGVzIGhhc2ggdGhhdCBkaWZmZXJzLCB0aGUgbW9kZWwnc1xuICAvLyBzdGF0ZSB3aWxsIGJlIGBzZXRgIGFnYWluLlxuICBzYXZlOiBmdW5jdGlvbihrZXksIHZhbCwgb3B0aW9ucykge1xuICAgIHZhciBhdHRycywgbWV0aG9kLCB4aHIsIGF0dHJpYnV0ZXMgPSB0aGlzLmF0dHJpYnV0ZXM7XG5cbiAgICAvLyBIYW5kbGUgYm90aCBgXCJrZXlcIiwgdmFsdWVgIGFuZCBge2tleTogdmFsdWV9YCAtc3R5bGUgYXJndW1lbnRzLlxuICAgIGlmIChrZXkgPT0gbnVsbCB8fCB0eXBlb2Yga2V5ID09PSAnb2JqZWN0Jykge1xuICAgICAgYXR0cnMgPSBrZXk7XG4gICAgICBvcHRpb25zID0gdmFsO1xuICAgIH0gZWxzZSB7XG4gICAgICAoYXR0cnMgPSB7fSlba2V5XSA9IHZhbDtcbiAgICB9XG5cbiAgICBvcHRpb25zID0gXy5leHRlbmQoe3ZhbGlkYXRlOiB0cnVlfSwgb3B0aW9ucyk7XG5cbiAgICAvLyBJZiB3ZSdyZSBub3Qgd2FpdGluZyBhbmQgYXR0cmlidXRlcyBleGlzdCwgc2F2ZSBhY3RzIGFzXG4gICAgLy8gYHNldChhdHRyKS5zYXZlKG51bGwsIG9wdHMpYCB3aXRoIHZhbGlkYXRpb24uIE90aGVyd2lzZSwgY2hlY2sgaWZcbiAgICAvLyB0aGUgbW9kZWwgd2lsbCBiZSB2YWxpZCB3aGVuIHRoZSBhdHRyaWJ1dGVzLCBpZiBhbnksIGFyZSBzZXQuXG4gICAgaWYgKGF0dHJzICYmICFvcHRpb25zLndhaXQpIHtcbiAgICAgIGlmICghdGhpcy5zZXQoYXR0cnMsIG9wdGlvbnMpKSByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghdGhpcy5fdmFsaWRhdGUoYXR0cnMsIG9wdGlvbnMpKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gU2V0IHRlbXBvcmFyeSBhdHRyaWJ1dGVzIGlmIGB7d2FpdDogdHJ1ZX1gLlxuICAgIGlmIChhdHRycyAmJiBvcHRpb25zLndhaXQpIHtcbiAgICAgIHRoaXMuYXR0cmlidXRlcyA9IF8uZXh0ZW5kKE9iamVjdC5jcmVhdGUobnVsbCksIGF0dHJpYnV0ZXMsIGF0dHJzKTtcbiAgICB9XG5cbiAgICAvLyBBZnRlciBhIHN1Y2Nlc3NmdWwgc2VydmVyLXNpZGUgc2F2ZSwgdGhlIGNsaWVudCBpcyAob3B0aW9uYWxseSlcbiAgICAvLyB1cGRhdGVkIHdpdGggdGhlIHNlcnZlci1zaWRlIHN0YXRlLlxuICAgIGlmIChvcHRpb25zLnBhcnNlID09PSB2b2lkIDApIG9wdGlvbnMucGFyc2UgPSB0cnVlO1xuICAgIHZhciBtb2RlbCA9IHRoaXM7XG4gICAgdmFyIHN1Y2Nlc3MgPSBvcHRpb25zLnN1Y2Nlc3M7XG4gICAgb3B0aW9ucy5zdWNjZXNzID0gZnVuY3Rpb24ocmVzcCkge1xuICAgICAgLy8gRW5zdXJlIGF0dHJpYnV0ZXMgYXJlIHJlc3RvcmVkIGR1cmluZyBzeW5jaHJvbm91cyBzYXZlcy5cbiAgICAgIG1vZGVsLmF0dHJpYnV0ZXMgPSBhdHRyaWJ1dGVzO1xuICAgICAgdmFyIHNlcnZlckF0dHJzID0gbW9kZWwucGFyc2UocmVzcCwgb3B0aW9ucyk7XG4gICAgICBpZiAob3B0aW9ucy53YWl0KSBzZXJ2ZXJBdHRycyA9IF8uZXh0ZW5kKGF0dHJzIHx8IHt9LCBzZXJ2ZXJBdHRycyk7XG4gICAgICBpZiAoc2VydmVyQXR0cnMgJiYgdHlwZW9mIHNlcnZlckF0dHJzID09PSAnb2JqZWN0JyAmJiAhbW9kZWwuc2V0KHNlcnZlckF0dHJzLCBvcHRpb25zKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoc3VjY2Vzcykgc3VjY2Vzcyhtb2RlbCwgcmVzcCwgb3B0aW9ucyk7XG4gICAgICBtb2RlbC50cmlnZ2VyKCdzeW5jJywgbW9kZWwsIHJlc3AsIG9wdGlvbnMpO1xuICAgIH07XG4gICAgd3JhcEVycm9yKHRoaXMsIG9wdGlvbnMpO1xuXG4gICAgbWV0aG9kID0gdGhpcy5pc05ldygpID8gJ2NyZWF0ZScgOiAob3B0aW9ucy5wYXRjaCA/ICdwYXRjaCcgOiAndXBkYXRlJyk7XG4gICAgaWYgKG1ldGhvZCA9PT0gJ3BhdGNoJykgb3B0aW9ucy5hdHRycyA9IGF0dHJzO1xuICAgIHhociA9IHRoaXMuc3luYyhtZXRob2QsIHRoaXMsIG9wdGlvbnMpO1xuXG4gICAgLy8gUmVzdG9yZSBhdHRyaWJ1dGVzLlxuICAgIGlmIChhdHRycyAmJiBvcHRpb25zLndhaXQpIHRoaXMuYXR0cmlidXRlcyA9IGF0dHJpYnV0ZXM7XG5cbiAgICByZXR1cm4geGhyO1xuICB9LFxuXG4gIC8vIERlc3Ryb3kgdGhpcyBtb2RlbCBvbiB0aGUgc2VydmVyIGlmIGl0IHdhcyBhbHJlYWR5IHBlcnNpc3RlZC5cbiAgLy8gT3B0aW1pc3RpY2FsbHkgcmVtb3ZlcyB0aGUgbW9kZWwgZnJvbSBpdHMgY29sbGVjdGlvbiwgaWYgaXQgaGFzIG9uZS5cbiAgLy8gSWYgYHdhaXQ6IHRydWVgIGlzIHBhc3NlZCwgd2FpdHMgZm9yIHRoZSBzZXJ2ZXIgdG8gcmVzcG9uZCBiZWZvcmUgcmVtb3ZhbC5cbiAgZGVzdHJveTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zID8gXy5leHRlbmQoe30sIG9wdGlvbnMpIDoge307XG4gICAgdmFyIG1vZGVsID0gdGhpcztcbiAgICB2YXIgc3VjY2VzcyA9IG9wdGlvbnMuc3VjY2VzcztcblxuICAgIHZhciBkZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gICAgICBtb2RlbC50cmlnZ2VyKCdkZXN0cm95JywgbW9kZWwsIG1vZGVsLmNvbGxlY3Rpb24sIG9wdGlvbnMpO1xuICAgIH07XG5cbiAgICBvcHRpb25zLnN1Y2Nlc3MgPSBmdW5jdGlvbihyZXNwKSB7XG4gICAgICBpZiAob3B0aW9ucy53YWl0IHx8IG1vZGVsLmlzTmV3KCkpIGRlc3Ryb3koKTtcbiAgICAgIGlmIChzdWNjZXNzKSBzdWNjZXNzKG1vZGVsLCByZXNwLCBvcHRpb25zKTtcbiAgICAgIGlmICghbW9kZWwuaXNOZXcoKSkgbW9kZWwudHJpZ2dlcignc3luYycsIG1vZGVsLCByZXNwLCBvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgaWYgKHRoaXMuaXNOZXcoKSkge1xuICAgICAgb3B0aW9ucy5zdWNjZXNzKCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHdyYXBFcnJvcih0aGlzLCBvcHRpb25zKTtcblxuICAgIHZhciB4aHIgPSB0aGlzLnN5bmMoJ2RlbGV0ZScsIHRoaXMsIG9wdGlvbnMpO1xuICAgIGlmICghb3B0aW9ucy53YWl0KSBkZXN0cm95KCk7XG4gICAgcmV0dXJuIHhocjtcbiAgfSxcblxuICAvLyBEZWZhdWx0IFVSTCBmb3IgdGhlIG1vZGVsJ3MgcmVwcmVzZW50YXRpb24gb24gdGhlIHNlcnZlciAtLSBpZiB5b3UncmVcbiAgLy8gdXNpbmcgQmFja2JvbmUncyByZXN0ZnVsIG1ldGhvZHMsIG92ZXJyaWRlIHRoaXMgdG8gY2hhbmdlIHRoZSBlbmRwb2ludFxuICAvLyB0aGF0IHdpbGwgYmUgY2FsbGVkLlxuICB1cmw6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBiYXNlID1cbiAgICAgIF8ucmVzdWx0KHRoaXMsICd1cmxSb290JykgfHxcbiAgICAgIF8ucmVzdWx0KHRoaXMuY29sbGVjdGlvbiwgJ3VybCcpIHx8XG4gICAgICB1cmxFcnJvcigpO1xuICAgIGlmICh0aGlzLmlzTmV3KCkpIHJldHVybiBiYXNlO1xuICAgIHJldHVybiBiYXNlLnJlcGxhY2UoLyhbXlxcL10pJC8sICckMS8nKSArIGVuY29kZVVSSUNvbXBvbmVudCh0aGlzLmlkKTtcbiAgfSxcblxuICAvLyAqKnBhcnNlKiogY29udmVydHMgYSByZXNwb25zZSBpbnRvIHRoZSBoYXNoIG9mIGF0dHJpYnV0ZXMgdG8gYmUgYHNldGAgb25cbiAgLy8gdGhlIG1vZGVsLiBUaGUgZGVmYXVsdCBpbXBsZW1lbnRhdGlvbiBpcyBqdXN0IHRvIHBhc3MgdGhlIHJlc3BvbnNlIGFsb25nLlxuICBwYXJzZTogZnVuY3Rpb24ocmVzcCwgb3B0aW9ucykge1xuICAgIHJldHVybiByZXNwO1xuICB9LFxuXG4gIC8vIENyZWF0ZSBhIG5ldyBtb2RlbCB3aXRoIGlkZW50aWNhbCBhdHRyaWJ1dGVzIHRvIHRoaXMgb25lLlxuICBjbG9uZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyB0aGlzLmNvbnN0cnVjdG9yKHRoaXMuYXR0cmlidXRlcyk7XG4gIH0sXG5cbiAgLy8gQSBtb2RlbCBpcyBuZXcgaWYgaXQgaGFzIG5ldmVyIGJlZW4gc2F2ZWQgdG8gdGhlIHNlcnZlciwgYW5kIGxhY2tzIGFuIGlkLlxuICBpc05ldzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICF0aGlzLmhhcyh0aGlzLmlkQXR0cmlidXRlKTtcbiAgfSxcblxuICAvLyBDaGVjayBpZiB0aGUgbW9kZWwgaXMgY3VycmVudGx5IGluIGEgdmFsaWQgc3RhdGUuXG4gIGlzVmFsaWQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy5fdmFsaWRhdGUoe30sIF8uZXh0ZW5kKG9wdGlvbnMgfHwge30sIHsgdmFsaWRhdGU6IHRydWUgfSkpO1xuICB9LFxuXG4gIC8vIFJ1biB2YWxpZGF0aW9uIGFnYWluc3QgdGhlIG5leHQgY29tcGxldGUgc2V0IG9mIG1vZGVsIGF0dHJpYnV0ZXMsXG4gIC8vIHJldHVybmluZyBgdHJ1ZWAgaWYgYWxsIGlzIHdlbGwuIE90aGVyd2lzZSwgZmlyZSBhbiBgXCJpbnZhbGlkXCJgIGV2ZW50LlxuICBfdmFsaWRhdGU6IGZ1bmN0aW9uKGF0dHJzLCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zLnZhbGlkYXRlIHx8ICF0aGlzLnZhbGlkYXRlKSByZXR1cm4gdHJ1ZTtcbiAgICBhdHRycyA9IF8uZXh0ZW5kKE9iamVjdC5jcmVhdGUobnVsbCksIHRoaXMuYXR0cmlidXRlcywgYXR0cnMpO1xuICAgIHZhciBlcnJvciA9IHRoaXMudmFsaWRhdGlvbkVycm9yID0gdGhpcy52YWxpZGF0ZShhdHRycywgb3B0aW9ucykgfHwgbnVsbDtcbiAgICBpZiAoIWVycm9yKSByZXR1cm4gdHJ1ZTtcbiAgICB0aGlzLnRyaWdnZXIoJ2ludmFsaWQnLCB0aGlzLCBlcnJvciwgXy5leHRlbmQob3B0aW9ucywge3ZhbGlkYXRpb25FcnJvcjogZXJyb3J9KSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbn0pO1xuXG5pZiAoXy5rZXlzKSB7XG4gIC8vIFVuZGVyc2NvcmUgbWV0aG9kcyB0aGF0IHdlIHdhbnQgdG8gaW1wbGVtZW50IG9uIHRoZSBNb2RlbC5cbiAgdmFyIG1vZGVsTWV0aG9kcyA9IFsna2V5cycsICd2YWx1ZXMnLCAncGFpcnMnLCAnaW52ZXJ0JywgJ3BpY2snLCAnb21pdCddO1xuXG4gIC8vIE1peCBpbiBlYWNoIFVuZGVyc2NvcmUgbWV0aG9kIGFzIGEgcHJveHkgdG8gYE1vZGVsI2F0dHJpYnV0ZXNgLlxuICBtb2RlbE1ldGhvZHMuZmlsdGVyKHV0aWxFeGlzdHMpLmZvckVhY2goZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgTW9kZWwucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgYXJncy51bnNoaWZ0KHRoaXMuYXR0cmlidXRlcyk7XG4gICAgICByZXR1cm4gX1ttZXRob2RdLmFwcGx5KF8sIGFyZ3MpO1xuICAgIH07XG4gIH0pO1xufVxuLy8gQmFja2JvbmUuQ29sbGVjdGlvblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBJZiBtb2RlbHMgdGVuZCB0byByZXByZXNlbnQgYSBzaW5nbGUgcm93IG9mIGRhdGEsIGEgQmFja2JvbmUgQ29sbGVjdGlvbiBpc1xuLy8gbW9yZSBhbmFsYWdvdXMgdG8gYSB0YWJsZSBmdWxsIG9mIGRhdGEgLi4uIG9yIGEgc21hbGwgc2xpY2Ugb3IgcGFnZSBvZiB0aGF0XG4vLyB0YWJsZSwgb3IgYSBjb2xsZWN0aW9uIG9mIHJvd3MgdGhhdCBiZWxvbmcgdG9nZXRoZXIgZm9yIGEgcGFydGljdWxhciByZWFzb25cbi8vIC0tIGFsbCBvZiB0aGUgbWVzc2FnZXMgaW4gdGhpcyBwYXJ0aWN1bGFyIGZvbGRlciwgYWxsIG9mIHRoZSBkb2N1bWVudHNcbi8vIGJlbG9uZ2luZyB0byB0aGlzIHBhcnRpY3VsYXIgYXV0aG9yLCBhbmQgc28gb24uIENvbGxlY3Rpb25zIG1haW50YWluXG4vLyBpbmRleGVzIG9mIHRoZWlyIG1vZGVscywgYm90aCBpbiBvcmRlciwgYW5kIGZvciBsb29rdXAgYnkgYGlkYC5cblxuLy8gQ3JlYXRlIGEgbmV3ICoqQ29sbGVjdGlvbioqLCBwZXJoYXBzIHRvIGNvbnRhaW4gYSBzcGVjaWZpYyB0eXBlIG9mIGBtb2RlbGAuXG4vLyBJZiBhIGBjb21wYXJhdG9yYCBpcyBzcGVjaWZpZWQsIHRoZSBDb2xsZWN0aW9uIHdpbGwgbWFpbnRhaW5cbi8vIGl0cyBtb2RlbHMgaW4gc29ydCBvcmRlciwgYXMgdGhleSdyZSBhZGRlZCBhbmQgcmVtb3ZlZC5cbnZhciBDb2xsZWN0aW9uID0gQmFja2JvbmUuQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKG1vZGVscywgb3B0aW9ucykge1xuICBvcHRpb25zIHx8IChvcHRpb25zID0ge30pO1xuICBpZiAob3B0aW9ucy5tb2RlbCkgdGhpcy5tb2RlbCA9IG9wdGlvbnMubW9kZWw7XG4gIGlmIChvcHRpb25zLmNvbXBhcmF0b3IgIT09IHZvaWQgMCkgdGhpcy5jb21wYXJhdG9yID0gb3B0aW9ucy5jb21wYXJhdG9yO1xuICB0aGlzLl9yZXNldCgpO1xuICB0aGlzLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgaWYgKG1vZGVscykgdGhpcy5yZXNldChtb2RlbHMsIF8uZXh0ZW5kKHtzaWxlbnQ6IHRydWV9LCBvcHRpb25zKSk7XG59O1xuXG4vLyBEZWZhdWx0IG9wdGlvbnMgZm9yIGBDb2xsZWN0aW9uI3NldGAuXG52YXIgc2V0T3B0aW9ucyA9IHthZGQ6IHRydWUsIHJlbW92ZTogdHJ1ZSwgbWVyZ2U6IHRydWV9O1xudmFyIGFkZE9wdGlvbnMgPSB7YWRkOiB0cnVlLCByZW1vdmU6IGZhbHNlfTtcblxuLy8gRGVmaW5lIHRoZSBDb2xsZWN0aW9uJ3MgaW5oZXJpdGFibGUgbWV0aG9kcy5cbl8uZXh0ZW5kKENvbGxlY3Rpb24ucHJvdG90eXBlLCBFdmVudHMsIHtcblxuICAvLyBUaGUgZGVmYXVsdCBtb2RlbCBmb3IgYSBjb2xsZWN0aW9uIGlzIGp1c3QgYSAqKkJhY2tib25lLk1vZGVsKiouXG4gIC8vIFRoaXMgc2hvdWxkIGJlIG92ZXJyaWRkZW4gaW4gbW9zdCBjYXNlcy5cbiAgbW9kZWw6IHR5cGVvZiBNb2RlbCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogTW9kZWwsXG5cbiAgLy8gSW5pdGlhbGl6ZSBpcyBhbiBlbXB0eSBmdW5jdGlvbiBieSBkZWZhdWx0LiBPdmVycmlkZSBpdCB3aXRoIHlvdXIgb3duXG4gIC8vIGluaXRpYWxpemF0aW9uIGxvZ2ljLlxuICBpbml0aWFsaXplOiBmdW5jdGlvbigpe30sXG5cbiAgLy8gVGhlIEpTT04gcmVwcmVzZW50YXRpb24gb2YgYSBDb2xsZWN0aW9uIGlzIGFuIGFycmF5IG9mIHRoZVxuICAvLyBtb2RlbHMnIGF0dHJpYnV0ZXMuXG4gIHRvSlNPTjogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIHJldHVybiB0aGlzLm1hcChmdW5jdGlvbihtb2RlbCl7IHJldHVybiBtb2RlbC50b0pTT04ob3B0aW9ucyk7IH0pO1xuICB9LFxuXG4gIC8vIFByb3h5IGBCYWNrYm9uZS5zeW5jYCBieSBkZWZhdWx0LlxuICBzeW5jOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gQmFja2JvbmUuc3luYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9LFxuXG4gIC8vIEFkZCBhIG1vZGVsLCBvciBsaXN0IG9mIG1vZGVscyB0byB0aGUgc2V0LlxuICBhZGQ6IGZ1bmN0aW9uKG1vZGVscywgb3B0aW9ucykge1xuICAgIHJldHVybiB0aGlzLnNldChtb2RlbHMsIF8uZXh0ZW5kKHttZXJnZTogZmFsc2V9LCBvcHRpb25zLCBhZGRPcHRpb25zKSk7XG4gIH0sXG5cbiAgLy8gUmVtb3ZlIGEgbW9kZWwsIG9yIGEgbGlzdCBvZiBtb2RlbHMgZnJvbSB0aGUgc2V0LlxuICByZW1vdmU6IGZ1bmN0aW9uKG1vZGVscywgb3B0aW9ucykge1xuICAgIHZhciBzaW5ndWxhciA9ICFBcnJheS5pc0FycmF5KG1vZGVscyk7XG4gICAgbW9kZWxzID0gc2luZ3VsYXIgPyBbbW9kZWxzXSA6IG1vZGVscy5zbGljZSgpO1xuICAgIG9wdGlvbnMgfHwgKG9wdGlvbnMgPSB7fSk7XG4gICAgdmFyIGksIGwsIGluZGV4LCBtb2RlbDtcbiAgICBmb3IgKGkgPSAwLCBsID0gbW9kZWxzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgbW9kZWwgPSBtb2RlbHNbaV0gPSB0aGlzLmdldChtb2RlbHNbaV0pO1xuICAgICAgaWYgKCFtb2RlbCkgY29udGludWU7XG4gICAgICBkZWxldGUgdGhpcy5fYnlJZFttb2RlbC5pZF07XG4gICAgICBkZWxldGUgdGhpcy5fYnlJZFttb2RlbC5jaWRdO1xuICAgICAgaW5kZXggPSB0aGlzLmluZGV4T2YobW9kZWwpO1xuICAgICAgdGhpcy5tb2RlbHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgIHRoaXMubGVuZ3RoLS07XG4gICAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB7XG4gICAgICAgIG9wdGlvbnMuaW5kZXggPSBpbmRleDtcbiAgICAgICAgbW9kZWwudHJpZ2dlcigncmVtb3ZlJywgbW9kZWwsIHRoaXMsIG9wdGlvbnMpO1xuICAgICAgfVxuICAgICAgdGhpcy5fcmVtb3ZlUmVmZXJlbmNlKG1vZGVsLCBvcHRpb25zKTtcbiAgICB9XG4gICAgcmV0dXJuIHNpbmd1bGFyID8gbW9kZWxzWzBdIDogbW9kZWxzO1xuICB9LFxuXG4gIC8vIFVwZGF0ZSBhIGNvbGxlY3Rpb24gYnkgYHNldGAtaW5nIGEgbmV3IGxpc3Qgb2YgbW9kZWxzLCBhZGRpbmcgbmV3IG9uZXMsXG4gIC8vIHJlbW92aW5nIG1vZGVscyB0aGF0IGFyZSBubyBsb25nZXIgcHJlc2VudCwgYW5kIG1lcmdpbmcgbW9kZWxzIHRoYXRcbiAgLy8gYWxyZWFkeSBleGlzdCBpbiB0aGUgY29sbGVjdGlvbiwgYXMgbmVjZXNzYXJ5LiBTaW1pbGFyIHRvICoqTW9kZWwjc2V0KiosXG4gIC8vIHRoZSBjb3JlIG9wZXJhdGlvbiBmb3IgdXBkYXRpbmcgdGhlIGRhdGEgY29udGFpbmVkIGJ5IHRoZSBjb2xsZWN0aW9uLlxuICBzZXQ6IGZ1bmN0aW9uKG1vZGVscywgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBfLmRlZmF1bHRzKHt9LCBvcHRpb25zLCBzZXRPcHRpb25zKTtcbiAgICBpZiAob3B0aW9ucy5wYXJzZSkgbW9kZWxzID0gdGhpcy5wYXJzZShtb2RlbHMsIG9wdGlvbnMpO1xuICAgIHZhciBzaW5ndWxhciA9ICFBcnJheS5pc0FycmF5KG1vZGVscyk7XG4gICAgbW9kZWxzID0gc2luZ3VsYXIgPyAobW9kZWxzID8gW21vZGVsc10gOiBbXSkgOiBtb2RlbHMuc2xpY2UoKTtcbiAgICB2YXIgaSwgbCwgaWQsIG1vZGVsLCBhdHRycywgZXhpc3RpbmcsIHNvcnQ7XG4gICAgdmFyIGF0ID0gb3B0aW9ucy5hdDtcbiAgICB2YXIgdGFyZ2V0TW9kZWwgPSB0aGlzLm1vZGVsO1xuICAgIHZhciBzb3J0YWJsZSA9IHRoaXMuY29tcGFyYXRvciAmJiAoYXQgPT0gbnVsbCkgJiYgb3B0aW9ucy5zb3J0ICE9PSBmYWxzZTtcbiAgICB2YXIgc29ydEF0dHIgPSB0eXBlb2YgdGhpcy5jb21wYXJhdG9yID09PSAnc3RyaW5nJyA/IHRoaXMuY29tcGFyYXRvciA6IG51bGw7XG4gICAgdmFyIHRvQWRkID0gW10sIHRvUmVtb3ZlID0gW10sIG1vZGVsTWFwID0ge307XG4gICAgdmFyIGFkZCA9IG9wdGlvbnMuYWRkLCBtZXJnZSA9IG9wdGlvbnMubWVyZ2UsIHJlbW92ZSA9IG9wdGlvbnMucmVtb3ZlO1xuICAgIHZhciBvcmRlciA9ICFzb3J0YWJsZSAmJiBhZGQgJiYgcmVtb3ZlID8gW10gOiBmYWxzZTtcblxuICAgIC8vIFR1cm4gYmFyZSBvYmplY3RzIGludG8gbW9kZWwgcmVmZXJlbmNlcywgYW5kIHByZXZlbnQgaW52YWxpZCBtb2RlbHNcbiAgICAvLyBmcm9tIGJlaW5nIGFkZGVkLlxuICAgIGZvciAoaSA9IDAsIGwgPSBtb2RlbHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBhdHRycyA9IG1vZGVsc1tpXSB8fCB7fTtcbiAgICAgIGlmIChhdHRycyBpbnN0YW5jZW9mIE1vZGVsKSB7XG4gICAgICAgIGlkID0gbW9kZWwgPSBhdHRycztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlkID0gYXR0cnNbdGFyZ2V0TW9kZWwucHJvdG90eXBlLmlkQXR0cmlidXRlIHx8ICdpZCddO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiBhIGR1cGxpY2F0ZSBpcyBmb3VuZCwgcHJldmVudCBpdCBmcm9tIGJlaW5nIGFkZGVkIGFuZFxuICAgICAgLy8gb3B0aW9uYWxseSBtZXJnZSBpdCBpbnRvIHRoZSBleGlzdGluZyBtb2RlbC5cbiAgICAgIGlmIChleGlzdGluZyA9IHRoaXMuZ2V0KGlkKSkge1xuICAgICAgICBpZiAocmVtb3ZlKSBtb2RlbE1hcFtleGlzdGluZy5jaWRdID0gdHJ1ZTtcbiAgICAgICAgaWYgKG1lcmdlKSB7XG4gICAgICAgICAgYXR0cnMgPSBhdHRycyA9PT0gbW9kZWwgPyBtb2RlbC5hdHRyaWJ1dGVzIDogYXR0cnM7XG4gICAgICAgICAgaWYgKG9wdGlvbnMucGFyc2UpIGF0dHJzID0gZXhpc3RpbmcucGFyc2UoYXR0cnMsIG9wdGlvbnMpO1xuICAgICAgICAgIGV4aXN0aW5nLnNldChhdHRycywgb3B0aW9ucyk7XG4gICAgICAgICAgaWYgKHNvcnRhYmxlICYmICFzb3J0ICYmIGV4aXN0aW5nLmhhc0NoYW5nZWQoc29ydEF0dHIpKSBzb3J0ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBtb2RlbHNbaV0gPSBleGlzdGluZztcblxuICAgICAgLy8gSWYgdGhpcyBpcyBhIG5ldywgdmFsaWQgbW9kZWwsIHB1c2ggaXQgdG8gdGhlIGB0b0FkZGAgbGlzdC5cbiAgICAgIH0gZWxzZSBpZiAoYWRkKSB7XG4gICAgICAgIG1vZGVsID0gbW9kZWxzW2ldID0gdGhpcy5fcHJlcGFyZU1vZGVsKGF0dHJzLCBvcHRpb25zKTtcbiAgICAgICAgaWYgKCFtb2RlbCkgY29udGludWU7XG4gICAgICAgIHRvQWRkLnB1c2gobW9kZWwpO1xuICAgICAgICB0aGlzLl9hZGRSZWZlcmVuY2UobW9kZWwsIG9wdGlvbnMpO1xuICAgICAgfVxuXG4gICAgICAvLyBEbyBub3QgYWRkIG11bHRpcGxlIG1vZGVscyB3aXRoIHRoZSBzYW1lIGBpZGAuXG4gICAgICBtb2RlbCA9IGV4aXN0aW5nIHx8IG1vZGVsO1xuICAgICAgaWYgKG9yZGVyICYmIChtb2RlbC5pc05ldygpIHx8ICFtb2RlbE1hcFttb2RlbC5pZF0pKSBvcmRlci5wdXNoKG1vZGVsKTtcbiAgICAgIG1vZGVsTWFwW21vZGVsLmlkXSA9IHRydWU7XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIG5vbmV4aXN0ZW50IG1vZGVscyBpZiBhcHByb3ByaWF0ZS5cbiAgICBpZiAocmVtb3ZlKSB7XG4gICAgICBmb3IgKGkgPSAwLCBsID0gdGhpcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgaWYgKCFtb2RlbE1hcFsobW9kZWwgPSB0aGlzLm1vZGVsc1tpXSkuY2lkXSkgdG9SZW1vdmUucHVzaChtb2RlbCk7XG4gICAgICB9XG4gICAgICBpZiAodG9SZW1vdmUubGVuZ3RoKSB0aGlzLnJlbW92ZSh0b1JlbW92ZSwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLy8gU2VlIGlmIHNvcnRpbmcgaXMgbmVlZGVkLCB1cGRhdGUgYGxlbmd0aGAgYW5kIHNwbGljZSBpbiBuZXcgbW9kZWxzLlxuICAgIGlmICh0b0FkZC5sZW5ndGggfHwgKG9yZGVyICYmIG9yZGVyLmxlbmd0aCkpIHtcbiAgICAgIGlmIChzb3J0YWJsZSkgc29ydCA9IHRydWU7XG4gICAgICB0aGlzLmxlbmd0aCArPSB0b0FkZC5sZW5ndGg7XG4gICAgICBpZiAoYXQgIT0gbnVsbCkge1xuICAgICAgICBmb3IgKGkgPSAwLCBsID0gdG9BZGQubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgdGhpcy5tb2RlbHMuc3BsaWNlKGF0ICsgaSwgMCwgdG9BZGRbaV0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAob3JkZXIpIHRoaXMubW9kZWxzLmxlbmd0aCA9IDA7XG4gICAgICAgIHZhciBvcmRlcmVkTW9kZWxzID0gb3JkZXIgfHwgdG9BZGQ7XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBvcmRlcmVkTW9kZWxzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgIHRoaXMubW9kZWxzLnB1c2gob3JkZXJlZE1vZGVsc1tpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTaWxlbnRseSBzb3J0IHRoZSBjb2xsZWN0aW9uIGlmIGFwcHJvcHJpYXRlLlxuICAgIGlmIChzb3J0KSB0aGlzLnNvcnQoe3NpbGVudDogdHJ1ZX0pO1xuXG4gICAgLy8gVW5sZXNzIHNpbGVuY2VkLCBpdCdzIHRpbWUgdG8gZmlyZSBhbGwgYXBwcm9wcmlhdGUgYWRkL3NvcnQgZXZlbnRzLlxuICAgIGlmICghb3B0aW9ucy5zaWxlbnQpIHtcbiAgICAgIGZvciAoaSA9IDAsIGwgPSB0b0FkZC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgKG1vZGVsID0gdG9BZGRbaV0pLnRyaWdnZXIoJ2FkZCcsIG1vZGVsLCB0aGlzLCBvcHRpb25zKTtcbiAgICAgIH1cbiAgICAgIGlmIChzb3J0IHx8IChvcmRlciAmJiBvcmRlci5sZW5ndGgpKSB0aGlzLnRyaWdnZXIoJ3NvcnQnLCB0aGlzLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdGhlIGFkZGVkIChvciBtZXJnZWQpIG1vZGVsIChvciBtb2RlbHMpLlxuICAgIHJldHVybiBzaW5ndWxhciA/IG1vZGVsc1swXSA6IG1vZGVscztcbiAgfSxcblxuICAvLyBXaGVuIHlvdSBoYXZlIG1vcmUgaXRlbXMgdGhhbiB5b3Ugd2FudCB0byBhZGQgb3IgcmVtb3ZlIGluZGl2aWR1YWxseSxcbiAgLy8geW91IGNhbiByZXNldCB0aGUgZW50aXJlIHNldCB3aXRoIGEgbmV3IGxpc3Qgb2YgbW9kZWxzLCB3aXRob3V0IGZpcmluZ1xuICAvLyBhbnkgZ3JhbnVsYXIgYGFkZGAgb3IgYHJlbW92ZWAgZXZlbnRzLiBGaXJlcyBgcmVzZXRgIHdoZW4gZmluaXNoZWQuXG4gIC8vIFVzZWZ1bCBmb3IgYnVsayBvcGVyYXRpb25zIGFuZCBvcHRpbWl6YXRpb25zLlxuICByZXNldDogZnVuY3Rpb24obW9kZWxzLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyB8fCAob3B0aW9ucyA9IHt9KTtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMubW9kZWxzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdGhpcy5fcmVtb3ZlUmVmZXJlbmNlKHRoaXMubW9kZWxzW2ldLCBvcHRpb25zKTtcbiAgICB9XG4gICAgb3B0aW9ucy5wcmV2aW91c01vZGVscyA9IHRoaXMubW9kZWxzO1xuICAgIHRoaXMuX3Jlc2V0KCk7XG4gICAgbW9kZWxzID0gdGhpcy5hZGQobW9kZWxzLCBfLmV4dGVuZCh7c2lsZW50OiB0cnVlfSwgb3B0aW9ucykpO1xuICAgIGlmICghb3B0aW9ucy5zaWxlbnQpIHRoaXMudHJpZ2dlcigncmVzZXQnLCB0aGlzLCBvcHRpb25zKTtcbiAgICByZXR1cm4gbW9kZWxzO1xuICB9LFxuXG4gIC8vIEFkZCBhIG1vZGVsIHRvIHRoZSBlbmQgb2YgdGhlIGNvbGxlY3Rpb24uXG4gIHB1c2g6IGZ1bmN0aW9uKG1vZGVsLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIHRoaXMuYWRkKG1vZGVsLCBfLmV4dGVuZCh7YXQ6IHRoaXMubGVuZ3RofSwgb3B0aW9ucykpO1xuICB9LFxuXG4gIC8vIFJlbW92ZSBhIG1vZGVsIGZyb20gdGhlIGVuZCBvZiB0aGUgY29sbGVjdGlvbi5cbiAgcG9wOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdmFyIG1vZGVsID0gdGhpcy5hdCh0aGlzLmxlbmd0aCAtIDEpO1xuICAgIHRoaXMucmVtb3ZlKG1vZGVsLCBvcHRpb25zKTtcbiAgICByZXR1cm4gbW9kZWw7XG4gIH0sXG5cbiAgLy8gQWRkIGEgbW9kZWwgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgY29sbGVjdGlvbi5cbiAgdW5zaGlmdDogZnVuY3Rpb24obW9kZWwsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy5hZGQobW9kZWwsIF8uZXh0ZW5kKHthdDogMH0sIG9wdGlvbnMpKTtcbiAgfSxcblxuICAvLyBSZW1vdmUgYSBtb2RlbCBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGNvbGxlY3Rpb24uXG4gIHNoaWZ0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdmFyIG1vZGVsID0gdGhpcy5hdCgwKTtcbiAgICB0aGlzLnJlbW92ZShtb2RlbCwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIG1vZGVsO1xuICB9LFxuXG4gIC8vIFNsaWNlIG91dCBhIHN1Yi1hcnJheSBvZiBtb2RlbHMgZnJvbSB0aGUgY29sbGVjdGlvbi5cbiAgc2xpY2U6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzbGljZS5hcHBseSh0aGlzLm1vZGVscywgYXJndW1lbnRzKTtcbiAgfSxcblxuICAvLyBHZXQgYSBtb2RlbCBmcm9tIHRoZSBzZXQgYnkgaWQuXG4gIGdldDogZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIHJldHVybiB0aGlzLl9ieUlkW29ial0gfHwgdGhpcy5fYnlJZFtvYmouaWRdIHx8IHRoaXMuX2J5SWRbb2JqLmNpZF07XG4gIH0sXG5cbiAgLy8gR2V0IHRoZSBtb2RlbCBhdCB0aGUgZ2l2ZW4gaW5kZXguXG4gIGF0OiBmdW5jdGlvbihpbmRleCkge1xuICAgIHJldHVybiB0aGlzLm1vZGVsc1tpbmRleF07XG4gIH0sXG5cbiAgLy8gUmV0dXJuIG1vZGVscyB3aXRoIG1hdGNoaW5nIGF0dHJpYnV0ZXMuIFVzZWZ1bCBmb3Igc2ltcGxlIGNhc2VzIG9mXG4gIC8vIGBmaWx0ZXJgLlxuICB3aGVyZTogZnVuY3Rpb24oYXR0cnMsIGZpcnN0KSB7XG4gICAgaWYgKCFhdHRycyB8fCAhT2JqZWN0LmtleXMoYXR0cnMpLmxlbmd0aCkgcmV0dXJuIGZpcnN0ID8gdm9pZCAwIDogW107XG4gICAgcmV0dXJuIHRoaXNbZmlyc3QgPyAnZmluZCcgOiAnZmlsdGVyJ10oZnVuY3Rpb24obW9kZWwpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBhdHRycykge1xuICAgICAgICBpZiAoYXR0cnNba2V5XSAhPT0gbW9kZWwuZ2V0KGtleSkpIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFJldHVybiB0aGUgZmlyc3QgbW9kZWwgd2l0aCBtYXRjaGluZyBhdHRyaWJ1dGVzLiBVc2VmdWwgZm9yIHNpbXBsZSBjYXNlc1xuICAvLyBvZiBgZmluZGAuXG4gIGZpbmRXaGVyZTogZnVuY3Rpb24oYXR0cnMpIHtcbiAgICByZXR1cm4gdGhpcy53aGVyZShhdHRycywgdHJ1ZSk7XG4gIH0sXG5cbiAgLy8gRm9yY2UgdGhlIGNvbGxlY3Rpb24gdG8gcmUtc29ydCBpdHNlbGYuIFlvdSBkb24ndCBuZWVkIHRvIGNhbGwgdGhpcyB1bmRlclxuICAvLyBub3JtYWwgY2lyY3Vtc3RhbmNlcywgYXMgdGhlIHNldCB3aWxsIG1haW50YWluIHNvcnQgb3JkZXIgYXMgZWFjaCBpdGVtXG4gIC8vIGlzIGFkZGVkLlxuICBzb3J0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgaWYgKCF0aGlzLmNvbXBhcmF0b3IpIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHNvcnQgYSBzZXQgd2l0aG91dCBhIGNvbXBhcmF0b3InKTtcbiAgICBvcHRpb25zIHx8IChvcHRpb25zID0ge30pO1xuXG4gICAgLy8gUnVuIHNvcnQgYmFzZWQgb24gdHlwZSBvZiBgY29tcGFyYXRvcmAuXG4gICAgaWYgKHR5cGVvZiB0aGlzLmNvbXBhcmF0b3IgPT09ICdzdHJpbmcnIHx8IHRoaXMuY29tcGFyYXRvci5sZW5ndGggPT09IDEpIHtcbiAgICAgIHRoaXMubW9kZWxzID0gdGhpcy5zb3J0QnkodGhpcy5jb21wYXJhdG9yLCB0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5tb2RlbHMuc29ydCh0aGlzLmNvbXBhcmF0b3IuYmluZCh0aGlzKSk7XG4gICAgfVxuXG4gICAgaWYgKCFvcHRpb25zLnNpbGVudCkgdGhpcy50cmlnZ2VyKCdzb3J0JywgdGhpcywgb3B0aW9ucyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLy8gUGx1Y2sgYW4gYXR0cmlidXRlIGZyb20gZWFjaCBtb2RlbCBpbiB0aGUgY29sbGVjdGlvbi5cbiAgcGx1Y2s6IGZ1bmN0aW9uKGF0dHIpIHtcbiAgICByZXR1cm4gdGhpcy5tb2RlbHMubWFwKGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgICByZXR1cm4gbW9kZWwuZ2V0KGF0dHIpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIEZldGNoIHRoZSBkZWZhdWx0IHNldCBvZiBtb2RlbHMgZm9yIHRoaXMgY29sbGVjdGlvbiwgcmVzZXR0aW5nIHRoZVxuICAvLyBjb2xsZWN0aW9uIHdoZW4gdGhleSBhcnJpdmUuIElmIGByZXNldDogdHJ1ZWAgaXMgcGFzc2VkLCB0aGUgcmVzcG9uc2VcbiAgLy8gZGF0YSB3aWxsIGJlIHBhc3NlZCB0aHJvdWdoIHRoZSBgcmVzZXRgIG1ldGhvZCBpbnN0ZWFkIG9mIGBzZXRgLlxuICBmZXRjaDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zID8gXy5leHRlbmQoe30sIG9wdGlvbnMpIDoge307XG4gICAgaWYgKG9wdGlvbnMucGFyc2UgPT09IHZvaWQgMCkgb3B0aW9ucy5wYXJzZSA9IHRydWU7XG4gICAgdmFyIHN1Y2Nlc3MgPSBvcHRpb25zLnN1Y2Nlc3M7XG4gICAgdmFyIGNvbGxlY3Rpb24gPSB0aGlzO1xuICAgIG9wdGlvbnMuc3VjY2VzcyA9IGZ1bmN0aW9uKHJlc3ApIHtcbiAgICAgIHZhciBtZXRob2QgPSBvcHRpb25zLnJlc2V0ID8gJ3Jlc2V0JyA6ICdzZXQnO1xuICAgICAgY29sbGVjdGlvblttZXRob2RdKHJlc3AsIG9wdGlvbnMpO1xuICAgICAgaWYgKHN1Y2Nlc3MpIHN1Y2Nlc3MoY29sbGVjdGlvbiwgcmVzcCwgb3B0aW9ucyk7XG4gICAgICBjb2xsZWN0aW9uLnRyaWdnZXIoJ3N5bmMnLCBjb2xsZWN0aW9uLCByZXNwLCBvcHRpb25zKTtcbiAgICB9O1xuICAgIHdyYXBFcnJvcih0aGlzLCBvcHRpb25zKTtcbiAgICByZXR1cm4gdGhpcy5zeW5jKCdyZWFkJywgdGhpcywgb3B0aW9ucyk7XG4gIH0sXG5cbiAgLy8gQ3JlYXRlIGEgbmV3IGluc3RhbmNlIG9mIGEgbW9kZWwgaW4gdGhpcyBjb2xsZWN0aW9uLiBBZGQgdGhlIG1vZGVsIHRvIHRoZVxuICAvLyBjb2xsZWN0aW9uIGltbWVkaWF0ZWx5LCB1bmxlc3MgYHdhaXQ6IHRydWVgIGlzIHBhc3NlZCwgaW4gd2hpY2ggY2FzZSB3ZVxuICAvLyB3YWl0IGZvciB0aGUgc2VydmVyIHRvIGFncmVlLlxuICBjcmVhdGU6IGZ1bmN0aW9uKG1vZGVsLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgPyBfLmV4dGVuZCh7fSwgb3B0aW9ucykgOiB7fTtcbiAgICBpZiAoIShtb2RlbCA9IHRoaXMuX3ByZXBhcmVNb2RlbChtb2RlbCwgb3B0aW9ucykpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFvcHRpb25zLndhaXQpIHRoaXMuYWRkKG1vZGVsLCBvcHRpb25zKTtcbiAgICB2YXIgY29sbGVjdGlvbiA9IHRoaXM7XG4gICAgdmFyIHN1Y2Nlc3MgPSBvcHRpb25zLnN1Y2Nlc3M7XG4gICAgb3B0aW9ucy5zdWNjZXNzID0gZnVuY3Rpb24obW9kZWwsIHJlc3ApIHtcbiAgICAgIGlmIChvcHRpb25zLndhaXQpIGNvbGxlY3Rpb24uYWRkKG1vZGVsLCBvcHRpb25zKTtcbiAgICAgIGlmIChzdWNjZXNzKSBzdWNjZXNzKG1vZGVsLCByZXNwLCBvcHRpb25zKTtcbiAgICB9O1xuICAgIG1vZGVsLnNhdmUobnVsbCwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIG1vZGVsO1xuICB9LFxuXG4gIC8vICoqcGFyc2UqKiBjb252ZXJ0cyBhIHJlc3BvbnNlIGludG8gYSBsaXN0IG9mIG1vZGVscyB0byBiZSBhZGRlZCB0byB0aGVcbiAgLy8gY29sbGVjdGlvbi4gVGhlIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gaXMganVzdCB0byBwYXNzIGl0IHRocm91Z2guXG4gIHBhcnNlOiBmdW5jdGlvbihyZXNwLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIHJlc3A7XG4gIH0sXG5cbiAgLy8gQ3JlYXRlIGEgbmV3IGNvbGxlY3Rpb24gd2l0aCBhbiBpZGVudGljYWwgbGlzdCBvZiBtb2RlbHMgYXMgdGhpcyBvbmUuXG4gIGNsb25lOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IHRoaXMuY29uc3RydWN0b3IodGhpcy5tb2RlbHMpO1xuICB9LFxuXG4gIC8vIFByaXZhdGUgbWV0aG9kIHRvIHJlc2V0IGFsbCBpbnRlcm5hbCBzdGF0ZS4gQ2FsbGVkIHdoZW4gdGhlIGNvbGxlY3Rpb25cbiAgLy8gaXMgZmlyc3QgaW5pdGlhbGl6ZWQgb3IgcmVzZXQuXG4gIF9yZXNldDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIHRoaXMubW9kZWxzID0gW107XG4gICAgdGhpcy5fYnlJZCAgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB9LFxuXG4gIC8vIFByZXBhcmUgYSBoYXNoIG9mIGF0dHJpYnV0ZXMgKG9yIG90aGVyIG1vZGVsKSB0byBiZSBhZGRlZCB0byB0aGlzXG4gIC8vIGNvbGxlY3Rpb24uXG4gIF9wcmVwYXJlTW9kZWw6IGZ1bmN0aW9uKGF0dHJzLCBvcHRpb25zKSB7XG4gICAgaWYgKGF0dHJzIGluc3RhbmNlb2YgTW9kZWwpIHJldHVybiBhdHRycztcbiAgICBvcHRpb25zID0gXy5leHRlbmQoe30sIG9wdGlvbnMpO1xuICAgIG9wdGlvbnMuY29sbGVjdGlvbiA9IHRoaXM7XG4gICAgdmFyIG1vZGVsID0gbmV3IHRoaXMubW9kZWwoYXR0cnMsIG9wdGlvbnMpO1xuICAgIGlmICghbW9kZWwudmFsaWRhdGlvbkVycm9yKSByZXR1cm4gbW9kZWw7XG4gICAgdGhpcy50cmlnZ2VyKCdpbnZhbGlkJywgdGhpcywgbW9kZWwudmFsaWRhdGlvbkVycm9yLCBvcHRpb25zKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cbiAgLy8gSW50ZXJuYWwgbWV0aG9kIHRvIGNyZWF0ZSBhIG1vZGVsJ3MgdGllcyB0byBhIGNvbGxlY3Rpb24uXG4gIF9hZGRSZWZlcmVuY2U6IGZ1bmN0aW9uKG1vZGVsLCBvcHRpb25zKSB7XG4gICAgdGhpcy5fYnlJZFttb2RlbC5jaWRdID0gbW9kZWw7XG4gICAgaWYgKG1vZGVsLmlkICE9IG51bGwpIHRoaXMuX2J5SWRbbW9kZWwuaWRdID0gbW9kZWw7XG4gICAgaWYgKCFtb2RlbC5jb2xsZWN0aW9uKSBtb2RlbC5jb2xsZWN0aW9uID0gdGhpcztcbiAgICBtb2RlbC5vbignYWxsJywgdGhpcy5fb25Nb2RlbEV2ZW50LCB0aGlzKTtcbiAgfSxcblxuICAvLyBJbnRlcm5hbCBtZXRob2QgdG8gc2V2ZXIgYSBtb2RlbCdzIHRpZXMgdG8gYSBjb2xsZWN0aW9uLlxuICBfcmVtb3ZlUmVmZXJlbmNlOiBmdW5jdGlvbihtb2RlbCwgb3B0aW9ucykge1xuICAgIGlmICh0aGlzID09PSBtb2RlbC5jb2xsZWN0aW9uKSBkZWxldGUgbW9kZWwuY29sbGVjdGlvbjtcbiAgICBtb2RlbC5vZmYoJ2FsbCcsIHRoaXMuX29uTW9kZWxFdmVudCwgdGhpcyk7XG4gIH0sXG5cbiAgLy8gSW50ZXJuYWwgbWV0aG9kIGNhbGxlZCBldmVyeSB0aW1lIGEgbW9kZWwgaW4gdGhlIHNldCBmaXJlcyBhbiBldmVudC5cbiAgLy8gU2V0cyBuZWVkIHRvIHVwZGF0ZSB0aGVpciBpbmRleGVzIHdoZW4gbW9kZWxzIGNoYW5nZSBpZHMuIEFsbCBvdGhlclxuICAvLyBldmVudHMgc2ltcGx5IHByb3h5IHRocm91Z2guIFwiYWRkXCIgYW5kIFwicmVtb3ZlXCIgZXZlbnRzIHRoYXQgb3JpZ2luYXRlXG4gIC8vIGluIG90aGVyIGNvbGxlY3Rpb25zIGFyZSBpZ25vcmVkLlxuICBfb25Nb2RlbEV2ZW50OiBmdW5jdGlvbihldmVudCwgbW9kZWwsIGNvbGxlY3Rpb24sIG9wdGlvbnMpIHtcbiAgICBpZiAoKGV2ZW50ID09PSAnYWRkJyB8fCBldmVudCA9PT0gJ3JlbW92ZScpICYmIGNvbGxlY3Rpb24gIT09IHRoaXMpIHJldHVybjtcbiAgICBpZiAoZXZlbnQgPT09ICdkZXN0cm95JykgdGhpcy5yZW1vdmUobW9kZWwsIG9wdGlvbnMpO1xuICAgIGlmIChtb2RlbCAmJiBldmVudCA9PT0gJ2NoYW5nZTonICsgbW9kZWwuaWRBdHRyaWJ1dGUpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ieUlkW21vZGVsLnByZXZpb3VzKG1vZGVsLmlkQXR0cmlidXRlKV07XG4gICAgICBpZiAobW9kZWwuaWQgIT0gbnVsbCkgdGhpcy5fYnlJZFttb2RlbC5pZF0gPSBtb2RlbDtcbiAgICB9XG4gICAgdGhpcy50cmlnZ2VyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxufSk7XG5cbmlmICh1dGlsRXhpc3RzKCdlYWNoJykpIHtcbiAgLy8gVW5kZXJzY29yZSBtZXRob2RzIHRoYXQgd2Ugd2FudCB0byBpbXBsZW1lbnQgb24gdGhlIENvbGxlY3Rpb24uXG4gIC8vIDkwJSBvZiB0aGUgY29yZSB1c2VmdWxuZXNzIG9mIEJhY2tib25lIENvbGxlY3Rpb25zIGlzIGFjdHVhbGx5IGltcGxlbWVudGVkXG4gIC8vIHJpZ2h0IGhlcmU6XG4gIHZhciBtZXRob2RzID0gWydmb3JFYWNoJywgJ2VhY2gnLCAnbWFwJywgJ2NvbGxlY3QnLCAncmVkdWNlJywgJ2ZvbGRsJyxcbiAgICAnaW5qZWN0JywgJ3JlZHVjZVJpZ2h0JywgJ2ZvbGRyJywgJ2ZpbmQnLCAnZGV0ZWN0JywgJ2ZpbHRlcicsICdzZWxlY3QnLFxuICAgICdyZWplY3QnLCAnZXZlcnknLCAnYWxsJywgJ3NvbWUnLCAnYW55JywgJ2luY2x1ZGUnLCAnY29udGFpbnMnLCAnaW52b2tlJyxcbiAgICAnbWF4JywgJ21pbicsICd0b0FycmF5JywgJ3NpemUnLCAnZmlyc3QnLCAnaGVhZCcsICd0YWtlJywgJ2luaXRpYWwnLCAncmVzdCcsXG4gICAgJ3RhaWwnLCAnZHJvcCcsICdsYXN0JywgJ3dpdGhvdXQnLCAnZGlmZmVyZW5jZScsICdpbmRleE9mJywgJ3NodWZmbGUnLFxuICAgICdsYXN0SW5kZXhPZicsICdpc0VtcHR5JywgJ2NoYWluJ107XG5cbiAgLy8gTWl4IGluIGVhY2ggVW5kZXJzY29yZSBtZXRob2QgYXMgYSBwcm94eSB0byBgQ29sbGVjdGlvbiNtb2RlbHNgLlxuICBtZXRob2RzLmZpbHRlcih1dGlsRXhpc3RzKS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgIENvbGxlY3Rpb24ucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgYXJncy51bnNoaWZ0KHRoaXMubW9kZWxzKTtcbiAgICAgIHJldHVybiBfW21ldGhvZF0uYXBwbHkoXywgYXJncyk7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gVW5kZXJzY29yZSBtZXRob2RzIHRoYXQgdGFrZSBhIHByb3BlcnR5IG5hbWUgYXMgYW4gYXJndW1lbnQuXG4gIHZhciBhdHRyaWJ1dGVNZXRob2RzID0gWydncm91cEJ5JywgJ2NvdW50QnknLCAnc29ydEJ5J107XG5cbiAgLy8gVXNlIGF0dHJpYnV0ZXMgaW5zdGVhZCBvZiBwcm9wZXJ0aWVzLlxuICBhdHRyaWJ1dGVNZXRob2RzLmZpbHRlcih1dGlsRXhpc3RzKS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgIENvbGxlY3Rpb24ucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbih2YWx1ZSwgY29udGV4dCkge1xuICAgICAgdmFyIGl0ZXJhdG9yID0gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nID8gdmFsdWUgOiBmdW5jdGlvbihtb2RlbCkge1xuICAgICAgICByZXR1cm4gbW9kZWwuZ2V0KHZhbHVlKTtcbiAgICAgIH07XG4gICAgICByZXR1cm4gX1ttZXRob2RdKHRoaXMubW9kZWxzLCBpdGVyYXRvciwgY29udGV4dCk7XG4gICAgfTtcbiAgfSk7XG59IGVsc2Uge1xuICBbJ2ZvckVhY2gnLCAnbWFwJywgJ2ZpbHRlcicsICdzb21lJywgJ2V2ZXJ5JywgJ3JlZHVjZScsICdyZWR1Y2VSaWdodCcsXG4gICAgJ2luZGV4T2YnLCAnbGFzdEluZGV4T2YnXS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgIENvbGxlY3Rpb24ucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbihhcmcsIGNvbnRleHQpIHtcbiAgICAgIHJldHVybiB0aGlzLm1vZGVsc1ttZXRob2RdKGFyZywgY29udGV4dCk7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gRXhvc2tlbGV0b24tc3BlY2lmaWM6XG4gIENvbGxlY3Rpb24ucHJvdG90eXBlLmZpbmQgPSBmdW5jdGlvbihpdGVyYXRvciwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgdGhpcy5zb21lKGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBVbmRlcnNjb3JlIG1ldGhvZHMgdGhhdCB0YWtlIGEgcHJvcGVydHkgbmFtZSBhcyBhbiBhcmd1bWVudC5cbiAgWydzb3J0QnknXS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgIENvbGxlY3Rpb24ucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbih2YWx1ZSwgY29udGV4dCkge1xuICAgICAgdmFyIGl0ZXJhdG9yID0gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nID8gdmFsdWUgOiBmdW5jdGlvbihtb2RlbCkge1xuICAgICAgICByZXR1cm4gbW9kZWwuZ2V0KHZhbHVlKTtcbiAgICAgIH07XG4gICAgICByZXR1cm4gX1ttZXRob2RdKHRoaXMubW9kZWxzLCBpdGVyYXRvciwgY29udGV4dCk7XG4gICAgfTtcbiAgfSk7XG59XG4vLyBCYWNrYm9uZS5WaWV3XG4vLyAtLS0tLS0tLS0tLS0tXG5cbi8vIEJhY2tib25lIFZpZXdzIGFyZSBhbG1vc3QgbW9yZSBjb252ZW50aW9uIHRoYW4gdGhleSBhcmUgYWN0dWFsIGNvZGUuIEEgVmlld1xuLy8gaXMgc2ltcGx5IGEgSmF2YVNjcmlwdCBvYmplY3QgdGhhdCByZXByZXNlbnRzIGEgbG9naWNhbCBjaHVuayBvZiBVSSBpbiB0aGVcbi8vIERPTS4gVGhpcyBtaWdodCBiZSBhIHNpbmdsZSBpdGVtLCBhbiBlbnRpcmUgbGlzdCwgYSBzaWRlYmFyIG9yIHBhbmVsLCBvclxuLy8gZXZlbiB0aGUgc3Vycm91bmRpbmcgZnJhbWUgd2hpY2ggd3JhcHMgeW91ciB3aG9sZSBhcHAuIERlZmluaW5nIGEgY2h1bmsgb2Zcbi8vIFVJIGFzIGEgKipWaWV3KiogYWxsb3dzIHlvdSB0byBkZWZpbmUgeW91ciBET00gZXZlbnRzIGRlY2xhcmF0aXZlbHksIHdpdGhvdXRcbi8vIGhhdmluZyB0byB3b3JyeSBhYm91dCByZW5kZXIgb3JkZXIgLi4uIGFuZCBtYWtlcyBpdCBlYXN5IGZvciB0aGUgdmlldyB0b1xuLy8gcmVhY3QgdG8gc3BlY2lmaWMgY2hhbmdlcyBpbiB0aGUgc3RhdGUgb2YgeW91ciBtb2RlbHMuXG5cbi8vIENyZWF0aW5nIGEgQmFja2JvbmUuVmlldyBjcmVhdGVzIGl0cyBpbml0aWFsIGVsZW1lbnQgb3V0c2lkZSBvZiB0aGUgRE9NLFxuLy8gaWYgYW4gZXhpc3RpbmcgZWxlbWVudCBpcyBub3QgcHJvdmlkZWQuLi5cbnZhciBWaWV3ID0gQmFja2JvbmUuVmlldyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgdGhpcy5jaWQgPSBfLnVuaXF1ZUlkKCd2aWV3Jyk7XG5cbiAgaWYgKG9wdGlvbnMpIE9iamVjdC5rZXlzKG9wdGlvbnMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKHZpZXdPcHRpb25zLmluZGV4T2Yoa2V5KSAhPT0gLTEpIHRoaXNba2V5XSA9IG9wdGlvbnNba2V5XTtcbiAgfSwgdGhpcyk7XG5cbiAgdGhpcy5fZW5zdXJlRWxlbWVudCgpO1xuICB0aGlzLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbi8vIENhY2hlZCByZWdleCB0byBzcGxpdCBrZXlzIGZvciBgZGVsZWdhdGVgLlxudmFyIGRlbGVnYXRlRXZlbnRTcGxpdHRlciA9IC9eKFxcUyspXFxzKiguKikkLztcblxuLy8gTGlzdCBvZiB2aWV3IG9wdGlvbnMgdG8gYmUgbWVyZ2VkIGFzIHByb3BlcnRpZXMuXG52YXIgdmlld09wdGlvbnMgPSBbJ21vZGVsJywgJ2NvbGxlY3Rpb24nLCAnZWwnLCAnaWQnLCAnYXR0cmlidXRlcycsICdjbGFzc05hbWUnLCAndGFnTmFtZScsICdldmVudHMnXTtcblxuLy8gU2V0IHVwIGFsbCBpbmhlcml0YWJsZSAqKkJhY2tib25lLlZpZXcqKiBwcm9wZXJ0aWVzIGFuZCBtZXRob2RzLlxuXy5leHRlbmQoVmlldy5wcm90b3R5cGUsIEV2ZW50cywge1xuXG4gIC8vIFRoZSBkZWZhdWx0IGB0YWdOYW1lYCBvZiBhIFZpZXcncyBlbGVtZW50IGlzIGBcImRpdlwiYC5cbiAgdGFnTmFtZTogJ2RpdicsXG5cbiAgLy8galF1ZXJ5IGRlbGVnYXRlIGZvciBlbGVtZW50IGxvb2t1cCwgc2NvcGVkIHRvIERPTSBlbGVtZW50cyB3aXRoaW4gdGhlXG4gIC8vIGN1cnJlbnQgdmlldy4gVGhpcyBzaG91bGQgYmUgcHJlZmVycmVkIHRvIGdsb2JhbCBsb29rdXBzIHdoZXJlIHBvc3NpYmxlLlxuICAkOiBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgIHJldHVybiB0aGlzLiRlbC5maW5kKHNlbGVjdG9yKTtcbiAgfSxcblxuICAvLyBJbml0aWFsaXplIGlzIGFuIGVtcHR5IGZ1bmN0aW9uIGJ5IGRlZmF1bHQuIE92ZXJyaWRlIGl0IHdpdGggeW91ciBvd25cbiAgLy8gaW5pdGlhbGl6YXRpb24gbG9naWMuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKCl7fSxcblxuICAvLyAqKnJlbmRlcioqIGlzIHRoZSBjb3JlIGZ1bmN0aW9uIHRoYXQgeW91ciB2aWV3IHNob3VsZCBvdmVycmlkZSwgaW4gb3JkZXJcbiAgLy8gdG8gcG9wdWxhdGUgaXRzIGVsZW1lbnQgKGB0aGlzLmVsYCksIHdpdGggdGhlIGFwcHJvcHJpYXRlIEhUTUwuIFRoZVxuICAvLyBjb252ZW50aW9uIGlzIGZvciAqKnJlbmRlcioqIHRvIGFsd2F5cyByZXR1cm4gYHRoaXNgLlxuICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8vIFJlbW92ZSB0aGlzIHZpZXcgYnkgdGFraW5nIHRoZSBlbGVtZW50IG91dCBvZiB0aGUgRE9NLCBhbmQgcmVtb3ZpbmcgYW55XG4gIC8vIGFwcGxpY2FibGUgQmFja2JvbmUuRXZlbnRzIGxpc3RlbmVycy5cbiAgcmVtb3ZlOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9yZW1vdmVFbGVtZW50KCk7XG4gICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLy8gUmVtb3ZlIHRoaXMgdmlldydzIGVsZW1lbnQgZnJvbSB0aGUgZG9jdW1lbnQgYW5kIGFsbCBldmVudCBsaXN0ZW5lcnNcbiAgLy8gYXR0YWNoZWQgdG8gaXQuIEV4cG9zZWQgZm9yIHN1YmNsYXNzZXMgdXNpbmcgYW4gYWx0ZXJuYXRpdmUgRE9NXG4gIC8vIG1hbmlwdWxhdGlvbiBBUEkuXG4gIF9yZW1vdmVFbGVtZW50OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLiRlbC5yZW1vdmUoKTtcbiAgfSxcblxuICAvLyBDaGFuZ2UgdGhlIHZpZXcncyBlbGVtZW50IChgdGhpcy5lbGAgcHJvcGVydHkpIGFuZCByZS1kZWxlZ2F0ZSB0aGVcbiAgLy8gdmlldydzIGV2ZW50cyBvbiB0aGUgbmV3IGVsZW1lbnQuXG4gIHNldEVsZW1lbnQ6IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICB0aGlzLnVuZGVsZWdhdGVFdmVudHMoKTtcbiAgICB0aGlzLl9zZXRFbGVtZW50KGVsZW1lbnQpO1xuICAgIHRoaXMuZGVsZWdhdGVFdmVudHMoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvLyBDcmVhdGVzIHRoZSBgdGhpcy5lbGAgYW5kIGB0aGlzLiRlbGAgcmVmZXJlbmNlcyBmb3IgdGhpcyB2aWV3IHVzaW5nIHRoZVxuICAvLyBnaXZlbiBgZWxgIGFuZCBhIGhhc2ggb2YgYGF0dHJpYnV0ZXNgLiBgZWxgIGNhbiBiZSBhIENTUyBzZWxlY3RvciBvciBhblxuICAvLyBIVE1MIHN0cmluZywgYSBqUXVlcnkgY29udGV4dCBvciBhbiBlbGVtZW50LiBTdWJjbGFzc2VzIGNhbiBvdmVycmlkZVxuICAvLyB0aGlzIHRvIHV0aWxpemUgYW4gYWx0ZXJuYXRpdmUgRE9NIG1hbmlwdWxhdGlvbiBBUEkgYW5kIGFyZSBvbmx5IHJlcXVpcmVkXG4gIC8vIHRvIHNldCB0aGUgYHRoaXMuZWxgIHByb3BlcnR5LlxuICBfc2V0RWxlbWVudDogZnVuY3Rpb24oZWwpIHtcbiAgICB0aGlzLiRlbCA9IGVsIGluc3RhbmNlb2YgQmFja2JvbmUuJCA/IGVsIDogQmFja2JvbmUuJChlbCk7XG4gICAgdGhpcy5lbCA9IHRoaXMuJGVsWzBdO1xuICB9LFxuXG4gIC8vIFNldCBjYWxsYmFja3MsIHdoZXJlIGB0aGlzLmV2ZW50c2AgaXMgYSBoYXNoIG9mXG4gIC8vXG4gIC8vICp7XCJldmVudCBzZWxlY3RvclwiOiBcImNhbGxiYWNrXCJ9KlxuICAvL1xuICAvLyAgICAge1xuICAvLyAgICAgICAnbW91c2Vkb3duIC50aXRsZSc6ICAnZWRpdCcsXG4gIC8vICAgICAgICdjbGljayAuYnV0dG9uJzogICAgICdzYXZlJyxcbiAgLy8gICAgICAgJ2NsaWNrIC5vcGVuJzogICAgICAgZnVuY3Rpb24oZSkgeyAuLi4gfVxuICAvLyAgICAgfVxuICAvL1xuICAvLyBwYWlycy4gQ2FsbGJhY2tzIHdpbGwgYmUgYm91bmQgdG8gdGhlIHZpZXcsIHdpdGggYHRoaXNgIHNldCBwcm9wZXJseS5cbiAgLy8gVXNlcyBldmVudCBkZWxlZ2F0aW9uIGZvciBlZmZpY2llbmN5LlxuICAvLyBPbWl0dGluZyB0aGUgc2VsZWN0b3IgYmluZHMgdGhlIGV2ZW50IHRvIGB0aGlzLmVsYC5cbiAgZGVsZWdhdGVFdmVudHM6IGZ1bmN0aW9uKGV2ZW50cykge1xuICAgIGlmICghKGV2ZW50cyB8fCAoZXZlbnRzID0gXy5yZXN1bHQodGhpcywgJ2V2ZW50cycpKSkpIHJldHVybiB0aGlzO1xuICAgIHRoaXMudW5kZWxlZ2F0ZUV2ZW50cygpO1xuICAgIGZvciAodmFyIGtleSBpbiBldmVudHMpIHtcbiAgICAgIHZhciBtZXRob2QgPSBldmVudHNba2V5XTtcbiAgICAgIGlmICh0eXBlb2YgbWV0aG9kICE9PSAnZnVuY3Rpb24nKSBtZXRob2QgPSB0aGlzW2V2ZW50c1trZXldXTtcbiAgICAgIC8vIGlmICghbWV0aG9kKSBjb250aW51ZTtcbiAgICAgIHZhciBtYXRjaCA9IGtleS5tYXRjaChkZWxlZ2F0ZUV2ZW50U3BsaXR0ZXIpO1xuICAgICAgdGhpcy5kZWxlZ2F0ZShtYXRjaFsxXSwgbWF0Y2hbMl0sIG1ldGhvZC5iaW5kKHRoaXMpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLy8gQWRkIGEgc2luZ2xlIGV2ZW50IGxpc3RlbmVyIHRvIHRoZSB2aWV3J3MgZWxlbWVudCAob3IgYSBjaGlsZCBlbGVtZW50XG4gIC8vIHVzaW5nIGBzZWxlY3RvcmApLiBUaGlzIG9ubHkgd29ya3MgZm9yIGRlbGVnYXRlLWFibGUgZXZlbnRzOiBub3QgYGZvY3VzYCxcbiAgLy8gYGJsdXJgLCBhbmQgbm90IGBjaGFuZ2VgLCBgc3VibWl0YCwgYW5kIGByZXNldGAgaW4gSW50ZXJuZXQgRXhwbG9yZXIuXG4gIGRlbGVnYXRlOiBmdW5jdGlvbihldmVudE5hbWUsIHNlbGVjdG9yLCBsaXN0ZW5lcikge1xuICAgIHRoaXMuJGVsLm9uKGV2ZW50TmFtZSArICcuZGVsZWdhdGVFdmVudHMnICsgdGhpcy5jaWQsIHNlbGVjdG9yLCBsaXN0ZW5lcik7XG4gIH0sXG5cbiAgLy8gQ2xlYXJzIGFsbCBjYWxsYmFja3MgcHJldmlvdXNseSBib3VuZCB0byB0aGUgdmlldyBieSBgZGVsZWdhdGVFdmVudHNgLlxuICAvLyBZb3UgdXN1YWxseSBkb24ndCBuZWVkIHRvIHVzZSB0aGlzLCBidXQgbWF5IHdpc2ggdG8gaWYgeW91IGhhdmUgbXVsdGlwbGVcbiAgLy8gQmFja2JvbmUgdmlld3MgYXR0YWNoZWQgdG8gdGhlIHNhbWUgRE9NIGVsZW1lbnQuXG4gIHVuZGVsZWdhdGVFdmVudHM6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLiRlbCkgdGhpcy4kZWwub2ZmKCcuZGVsZWdhdGVFdmVudHMnICsgdGhpcy5jaWQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8vIEEgZmluZXItZ3JhaW5lZCBgdW5kZWxlZ2F0ZUV2ZW50c2AgZm9yIHJlbW92aW5nIGEgc2luZ2xlIGRlbGVnYXRlZCBldmVudC5cbiAgLy8gYHNlbGVjdG9yYCBhbmQgYGxpc3RlbmVyYCBhcmUgYm90aCBvcHRpb25hbC5cbiAgdW5kZWxlZ2F0ZTogZnVuY3Rpb24oZXZlbnROYW1lLCBzZWxlY3RvciwgbGlzdGVuZXIpIHtcbiAgICB0aGlzLiRlbC5vZmYoZXZlbnROYW1lICsgJy5kZWxlZ2F0ZUV2ZW50cycgKyB0aGlzLmNpZCwgc2VsZWN0b3IsIGxpc3RlbmVyKTtcbiAgfSxcblxuICAvLyBQcm9kdWNlcyBhIERPTSBlbGVtZW50IHRvIGJlIGFzc2lnbmVkIHRvIHlvdXIgdmlldy4gRXhwb3NlZCBmb3JcbiAgLy8gc3ViY2xhc3NlcyB1c2luZyBhbiBhbHRlcm5hdGl2ZSBET00gbWFuaXB1bGF0aW9uIEFQSS5cbiAgX2NyZWF0ZUVsZW1lbnQ6IGZ1bmN0aW9uKHRhZ05hbWUpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbiAgfSxcblxuICAvLyBFbnN1cmUgdGhhdCB0aGUgVmlldyBoYXMgYSBET00gZWxlbWVudCB0byByZW5kZXIgaW50by5cbiAgLy8gSWYgYHRoaXMuZWxgIGlzIGEgc3RyaW5nLCBwYXNzIGl0IHRocm91Z2ggYCQoKWAsIHRha2UgdGhlIGZpcnN0XG4gIC8vIG1hdGNoaW5nIGVsZW1lbnQsIGFuZCByZS1hc3NpZ24gaXQgdG8gYGVsYC4gT3RoZXJ3aXNlLCBjcmVhdGVcbiAgLy8gYW4gZWxlbWVudCBmcm9tIHRoZSBgaWRgLCBgY2xhc3NOYW1lYCBhbmQgYHRhZ05hbWVgIHByb3BlcnRpZXMuXG4gIF9lbnN1cmVFbGVtZW50OiBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuZWwpIHtcbiAgICAgIHZhciBhdHRycyA9IF8uZXh0ZW5kKHt9LCBfLnJlc3VsdCh0aGlzLCAnYXR0cmlidXRlcycpKTtcbiAgICAgIGlmICh0aGlzLmlkKSBhdHRycy5pZCA9IF8ucmVzdWx0KHRoaXMsICdpZCcpO1xuICAgICAgaWYgKHRoaXMuY2xhc3NOYW1lKSBhdHRyc1snY2xhc3MnXSA9IF8ucmVzdWx0KHRoaXMsICdjbGFzc05hbWUnKTtcbiAgICAgIHRoaXMuc2V0RWxlbWVudCh0aGlzLl9jcmVhdGVFbGVtZW50KF8ucmVzdWx0KHRoaXMsICd0YWdOYW1lJykpKTtcbiAgICAgIHRoaXMuX3NldEF0dHJpYnV0ZXMoYXR0cnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNldEVsZW1lbnQoXy5yZXN1bHQodGhpcywgJ2VsJykpO1xuICAgIH1cbiAgfSxcblxuICAvLyBTZXQgYXR0cmlidXRlcyBmcm9tIGEgaGFzaCBvbiB0aGlzIHZpZXcncyBlbGVtZW50LiAgRXhwb3NlZCBmb3JcbiAgLy8gc3ViY2xhc3NlcyB1c2luZyBhbiBhbHRlcm5hdGl2ZSBET00gbWFuaXB1bGF0aW9uIEFQSS5cbiAgX3NldEF0dHJpYnV0ZXM6IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcbiAgICB0aGlzLiRlbC5hdHRyKGF0dHJpYnV0ZXMpO1xuICB9XG5cbn0pO1xuLy8gQmFja2JvbmUuc3luY1xuLy8gLS0tLS0tLS0tLS0tLVxuXG4vLyBPdmVycmlkZSB0aGlzIGZ1bmN0aW9uIHRvIGNoYW5nZSB0aGUgbWFubmVyIGluIHdoaWNoIEJhY2tib25lIHBlcnNpc3RzXG4vLyBtb2RlbHMgdG8gdGhlIHNlcnZlci4gWW91IHdpbGwgYmUgcGFzc2VkIHRoZSB0eXBlIG9mIHJlcXVlc3QsIGFuZCB0aGVcbi8vIG1vZGVsIGluIHF1ZXN0aW9uLiBCeSBkZWZhdWx0LCBtYWtlcyBhIFJFU1RmdWwgQWpheCByZXF1ZXN0XG4vLyB0byB0aGUgbW9kZWwncyBgdXJsKClgLiBTb21lIHBvc3NpYmxlIGN1c3RvbWl6YXRpb25zIGNvdWxkIGJlOlxuLy9cbi8vICogVXNlIGBzZXRUaW1lb3V0YCB0byBiYXRjaCByYXBpZC1maXJlIHVwZGF0ZXMgaW50byBhIHNpbmdsZSByZXF1ZXN0LlxuLy8gKiBTZW5kIHVwIHRoZSBtb2RlbHMgYXMgWE1MIGluc3RlYWQgb2YgSlNPTi5cbi8vICogUGVyc2lzdCBtb2RlbHMgdmlhIFdlYlNvY2tldHMgaW5zdGVhZCBvZiBBamF4LlxuQmFja2JvbmUuc3luYyA9IGZ1bmN0aW9uKG1ldGhvZCwgbW9kZWwsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyB8fCAob3B0aW9ucyA9IHt9KVxuXG4gIHZhciB0eXBlID0gbWV0aG9kTWFwW21ldGhvZF07XG5cbiAgLy8gRGVmYXVsdCBKU09OLXJlcXVlc3Qgb3B0aW9ucy5cbiAgdmFyIHBhcmFtcyA9IHt0eXBlOiB0eXBlLCBkYXRhVHlwZTogJ2pzb24nfTtcblxuICAvLyBFbnN1cmUgdGhhdCB3ZSBoYXZlIGEgVVJMLlxuICBpZiAoIW9wdGlvbnMudXJsKSB7XG4gICAgcGFyYW1zLnVybCA9IF8ucmVzdWx0KG1vZGVsLCAndXJsJykgfHwgdXJsRXJyb3IoKTtcbiAgfVxuXG4gIC8vIEVuc3VyZSB0aGF0IHdlIGhhdmUgdGhlIGFwcHJvcHJpYXRlIHJlcXVlc3QgZGF0YS5cbiAgaWYgKG9wdGlvbnMuZGF0YSA9PSBudWxsICYmIG1vZGVsICYmIChtZXRob2QgPT09ICdjcmVhdGUnIHx8IG1ldGhvZCA9PT0gJ3VwZGF0ZScgfHwgbWV0aG9kID09PSAncGF0Y2gnKSkge1xuICAgIHBhcmFtcy5jb250ZW50VHlwZSA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAgICBwYXJhbXMuZGF0YSA9IEpTT04uc3RyaW5naWZ5KG9wdGlvbnMuYXR0cnMgfHwgbW9kZWwudG9KU09OKG9wdGlvbnMpKTtcbiAgfVxuXG4gIC8vIERvbid0IHByb2Nlc3MgZGF0YSBvbiBhIG5vbi1HRVQgcmVxdWVzdC5cbiAgaWYgKHBhcmFtcy50eXBlICE9PSAnR0VUJykge1xuICAgIHBhcmFtcy5wcm9jZXNzRGF0YSA9IGZhbHNlO1xuICB9XG5cbiAgLy8gTWFrZSB0aGUgcmVxdWVzdCwgYWxsb3dpbmcgdGhlIHVzZXIgdG8gb3ZlcnJpZGUgYW55IEFqYXggb3B0aW9ucy5cbiAgdmFyIHhociA9IG9wdGlvbnMueGhyID0gQmFja2JvbmUuYWpheChfLmV4dGVuZChwYXJhbXMsIG9wdGlvbnMpKTtcbiAgbW9kZWwudHJpZ2dlcigncmVxdWVzdCcsIG1vZGVsLCB4aHIsIG9wdGlvbnMpO1xuICByZXR1cm4geGhyO1xufTtcblxuLy8gTWFwIGZyb20gQ1JVRCB0byBIVFRQIGZvciBvdXIgZGVmYXVsdCBgQmFja2JvbmUuc3luY2AgaW1wbGVtZW50YXRpb24uXG52YXIgbWV0aG9kTWFwID0ge1xuICAnY3JlYXRlJzogJ1BPU1QnLFxuICAndXBkYXRlJzogJ1BVVCcsXG4gICdwYXRjaCc6ICAnUEFUQ0gnLFxuICAnZGVsZXRlJzogJ0RFTEVURScsXG4gICdyZWFkJzogICAnR0VUJ1xufTtcblxuLy8gU2V0IHRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIG9mIGBCYWNrYm9uZS5hamF4YCB0byBwcm94eSB0aHJvdWdoIHRvIGAkYC5cbi8vIE92ZXJyaWRlIHRoaXMgaWYgeW91J2QgbGlrZSB0byB1c2UgYSBkaWZmZXJlbnQgbGlicmFyeS5cbkJhY2tib25lLmFqYXggPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIEJhY2tib25lLiQuYWpheC5hcHBseShCYWNrYm9uZS4kLCBhcmd1bWVudHMpO1xufTtcbi8vIEJhY2tib25lLlJvdXRlclxuLy8gLS0tLS0tLS0tLS0tLS0tXG5cbi8vIFJvdXRlcnMgbWFwIGZhdXgtVVJMcyB0byBhY3Rpb25zLCBhbmQgZmlyZSBldmVudHMgd2hlbiByb3V0ZXMgYXJlXG4vLyBtYXRjaGVkLiBDcmVhdGluZyBhIG5ldyBvbmUgc2V0cyBpdHMgYHJvdXRlc2AgaGFzaCwgaWYgbm90IHNldCBzdGF0aWNhbGx5LlxudmFyIFJvdXRlciA9IEJhY2tib25lLlJvdXRlciA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyB8fCAob3B0aW9ucyA9IHt9KTtcbiAgaWYgKG9wdGlvbnMucm91dGVzKSB0aGlzLnJvdXRlcyA9IG9wdGlvbnMucm91dGVzO1xuICB0aGlzLl9iaW5kUm91dGVzKCk7XG4gIHRoaXMuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuLy8gQ2FjaGVkIHJlZ3VsYXIgZXhwcmVzc2lvbnMgZm9yIG1hdGNoaW5nIG5hbWVkIHBhcmFtIHBhcnRzIGFuZCBzcGxhdHRlZFxuLy8gcGFydHMgb2Ygcm91dGUgc3RyaW5ncy5cbnZhciBvcHRpb25hbFBhcmFtID0gL1xcKCguKj8pXFwpL2c7XG52YXIgbmFtZWRQYXJhbSAgICA9IC8oXFwoXFw/KT86XFx3Ky9nO1xudmFyIHNwbGF0UGFyYW0gICAgPSAvXFwqXFx3Ky9nO1xudmFyIGVzY2FwZVJlZ0V4cCAgPSAvW1xcLXt9XFxbXFxdKz8uLFxcXFxcXF4kfCNcXHNdL2c7XG5cbnZhciBpc1JlZ0V4cCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSA/ICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBSZWdFeHBdJykgOiBmYWxzZTtcbn07XG5cbi8vIFNldCB1cCBhbGwgaW5oZXJpdGFibGUgKipCYWNrYm9uZS5Sb3V0ZXIqKiBwcm9wZXJ0aWVzIGFuZCBtZXRob2RzLlxuXy5leHRlbmQoUm91dGVyLnByb3RvdHlwZSwgRXZlbnRzLCB7XG5cbiAgLy8gSW5pdGlhbGl6ZSBpcyBhbiBlbXB0eSBmdW5jdGlvbiBieSBkZWZhdWx0LiBPdmVycmlkZSBpdCB3aXRoIHlvdXIgb3duXG4gIC8vIGluaXRpYWxpemF0aW9uIGxvZ2ljLlxuICBpbml0aWFsaXplOiBmdW5jdGlvbigpe30sXG5cbiAgLy8gTWFudWFsbHkgYmluZCBhIHNpbmdsZSBuYW1lZCByb3V0ZSB0byBhIGNhbGxiYWNrLiBGb3IgZXhhbXBsZTpcbiAgLy9cbiAgLy8gICAgIHRoaXMucm91dGUoJ3NlYXJjaC86cXVlcnkvcDpudW0nLCAnc2VhcmNoJywgZnVuY3Rpb24ocXVlcnksIG51bSkge1xuICAvLyAgICAgICAuLi5cbiAgLy8gICAgIH0pO1xuICAvL1xuICByb3V0ZTogZnVuY3Rpb24ocm91dGUsIG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFpc1JlZ0V4cChyb3V0ZSkpIHJvdXRlID0gdGhpcy5fcm91dGVUb1JlZ0V4cChyb3V0ZSk7XG4gICAgaWYgKHR5cGVvZiBuYW1lID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IG5hbWU7XG4gICAgICBuYW1lID0gJyc7XG4gICAgfVxuICAgIGlmICghY2FsbGJhY2spIGNhbGxiYWNrID0gdGhpc1tuYW1lXTtcbiAgICB2YXIgcm91dGVyID0gdGhpcztcbiAgICBCYWNrYm9uZS5oaXN0b3J5LnJvdXRlKHJvdXRlLCBmdW5jdGlvbihmcmFnbWVudCkge1xuICAgICAgdmFyIGFyZ3MgPSByb3V0ZXIuX2V4dHJhY3RQYXJhbWV0ZXJzKHJvdXRlLCBmcmFnbWVudCk7XG4gICAgICByb3V0ZXIuZXhlY3V0ZShjYWxsYmFjaywgYXJncyk7XG4gICAgICByb3V0ZXIudHJpZ2dlci5hcHBseShyb3V0ZXIsIFsncm91dGU6JyArIG5hbWVdLmNvbmNhdChhcmdzKSk7XG4gICAgICByb3V0ZXIudHJpZ2dlcigncm91dGUnLCBuYW1lLCBhcmdzKTtcbiAgICAgIEJhY2tib25lLmhpc3RvcnkudHJpZ2dlcigncm91dGUnLCByb3V0ZXIsIG5hbWUsIGFyZ3MpO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8vIEV4ZWN1dGUgYSByb3V0ZSBoYW5kbGVyIHdpdGggdGhlIHByb3ZpZGVkIHBhcmFtZXRlcnMuICBUaGlzIGlzIGFuXG4gIC8vIGV4Y2VsbGVudCBwbGFjZSB0byBkbyBwcmUtcm91dGUgc2V0dXAgb3IgcG9zdC1yb3V0ZSBjbGVhbnVwLlxuICBleGVjdXRlOiBmdW5jdGlvbihjYWxsYmFjaywgYXJncykge1xuICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2suYXBwbHkodGhpcywgYXJncyk7XG4gIH0sXG5cbiAgLy8gU2ltcGxlIHByb3h5IHRvIGBCYWNrYm9uZS5oaXN0b3J5YCB0byBzYXZlIGEgZnJhZ21lbnQgaW50byB0aGUgaGlzdG9yeS5cbiAgbmF2aWdhdGU6IGZ1bmN0aW9uKGZyYWdtZW50LCBvcHRpb25zKSB7XG4gICAgQmFja2JvbmUuaGlzdG9yeS5uYXZpZ2F0ZShmcmFnbWVudCwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLy8gQmluZCBhbGwgZGVmaW5lZCByb3V0ZXMgdG8gYEJhY2tib25lLmhpc3RvcnlgLiBXZSBoYXZlIHRvIHJldmVyc2UgdGhlXG4gIC8vIG9yZGVyIG9mIHRoZSByb3V0ZXMgaGVyZSB0byBzdXBwb3J0IGJlaGF2aW9yIHdoZXJlIHRoZSBtb3N0IGdlbmVyYWxcbiAgLy8gcm91dGVzIGNhbiBiZSBkZWZpbmVkIGF0IHRoZSBib3R0b20gb2YgdGhlIHJvdXRlIG1hcC5cbiAgX2JpbmRSb3V0ZXM6IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5yb3V0ZXMpIHJldHVybjtcbiAgICB0aGlzLnJvdXRlcyA9IF8ucmVzdWx0KHRoaXMsICdyb3V0ZXMnKTtcbiAgICB2YXIgcm91dGUsIHJvdXRlcyA9IE9iamVjdC5rZXlzKHRoaXMucm91dGVzKTtcbiAgICB3aGlsZSAoKHJvdXRlID0gcm91dGVzLnBvcCgpKSAhPSBudWxsKSB7XG4gICAgICB0aGlzLnJvdXRlKHJvdXRlLCB0aGlzLnJvdXRlc1tyb3V0ZV0pO1xuICAgIH1cbiAgfSxcblxuICAvLyBDb252ZXJ0IGEgcm91dGUgc3RyaW5nIGludG8gYSByZWd1bGFyIGV4cHJlc3Npb24sIHN1aXRhYmxlIGZvciBtYXRjaGluZ1xuICAvLyBhZ2FpbnN0IHRoZSBjdXJyZW50IGxvY2F0aW9uIGhhc2guXG4gIF9yb3V0ZVRvUmVnRXhwOiBmdW5jdGlvbihyb3V0ZSkge1xuICAgIHJvdXRlID0gcm91dGUucmVwbGFjZShlc2NhcGVSZWdFeHAsICdcXFxcJCYnKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZShvcHRpb25hbFBhcmFtLCAnKD86JDEpPycpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKG5hbWVkUGFyYW0sIGZ1bmN0aW9uKG1hdGNoLCBvcHRpb25hbCkge1xuICAgICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25hbCA/IG1hdGNoIDogJyhbXi8/XSspJztcbiAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2Uoc3BsYXRQYXJhbSwgJyhbXj9dKj8pJyk7XG4gICAgcmV0dXJuIG5ldyBSZWdFeHAoJ14nICsgcm91dGUgKyAnKD86XFxcXD8oW1xcXFxzXFxcXFNdKikpPyQnKTtcbiAgfSxcblxuICAvLyBHaXZlbiBhIHJvdXRlLCBhbmQgYSBVUkwgZnJhZ21lbnQgdGhhdCBpdCBtYXRjaGVzLCByZXR1cm4gdGhlIGFycmF5IG9mXG4gIC8vIGV4dHJhY3RlZCBkZWNvZGVkIHBhcmFtZXRlcnMuIEVtcHR5IG9yIHVubWF0Y2hlZCBwYXJhbWV0ZXJzIHdpbGwgYmVcbiAgLy8gdHJlYXRlZCBhcyBgbnVsbGAgdG8gbm9ybWFsaXplIGNyb3NzLWJyb3dzZXIgYmVoYXZpb3IuXG4gIF9leHRyYWN0UGFyYW1ldGVyczogZnVuY3Rpb24ocm91dGUsIGZyYWdtZW50KSB7XG4gICAgdmFyIHBhcmFtcyA9IHJvdXRlLmV4ZWMoZnJhZ21lbnQpLnNsaWNlKDEpO1xuICAgIHJldHVybiBwYXJhbXMubWFwKGZ1bmN0aW9uKHBhcmFtLCBpKSB7XG4gICAgICAvLyBEb24ndCBkZWNvZGUgdGhlIHNlYXJjaCBwYXJhbXMuXG4gICAgICBpZiAoaSA9PT0gcGFyYW1zLmxlbmd0aCAtIDEpIHJldHVybiBwYXJhbSB8fCBudWxsO1xuICAgICAgcmV0dXJuIHBhcmFtID8gZGVjb2RlVVJJQ29tcG9uZW50KHBhcmFtKSA6IG51bGw7XG4gICAgfSk7XG4gIH1cblxufSk7XG4vLyBCYWNrYm9uZS5IaXN0b3J5XG4vLyAtLS0tLS0tLS0tLS0tLS0tXG5cbi8vIEhhbmRsZXMgY3Jvc3MtYnJvd3NlciBoaXN0b3J5IG1hbmFnZW1lbnQsIGJhc2VkIG9uIGVpdGhlclxuLy8gW3B1c2hTdGF0ZV0oaHR0cDovL2RpdmVpbnRvaHRtbDUuaW5mby9oaXN0b3J5Lmh0bWwpIGFuZCByZWFsIFVSTHMsIG9yXG4vLyBbb25oYXNoY2hhbmdlXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL0RPTS93aW5kb3cub25oYXNoY2hhbmdlKVxuLy8gYW5kIFVSTCBmcmFnbWVudHMuXG52YXIgSGlzdG9yeSA9IEJhY2tib25lLkhpc3RvcnkgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5oYW5kbGVycyA9IFtdO1xuICB0aGlzLmNoZWNrVXJsID0gdGhpcy5jaGVja1VybC5iaW5kKHRoaXMpO1xuXG4gIC8vIEVuc3VyZSB0aGF0IGBIaXN0b3J5YCBjYW4gYmUgdXNlZCBvdXRzaWRlIG9mIHRoZSBicm93c2VyLlxuICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB0aGlzLmxvY2F0aW9uID0gd2luZG93LmxvY2F0aW9uO1xuICAgIHRoaXMuaGlzdG9yeSA9IHdpbmRvdy5oaXN0b3J5O1xuICB9XG59O1xuXG4vLyBDYWNoZWQgcmVnZXggZm9yIHN0cmlwcGluZyBhIGxlYWRpbmcgaGFzaC9zbGFzaCBhbmQgdHJhaWxpbmcgc3BhY2UuXG52YXIgcm91dGVTdHJpcHBlciA9IC9eWyNcXC9dfFxccyskL2c7XG5cbi8vIENhY2hlZCByZWdleCBmb3Igc3RyaXBwaW5nIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHNsYXNoZXMuXG52YXIgcm9vdFN0cmlwcGVyID0gL15cXC8rfFxcLyskL2c7XG5cbi8vIENhY2hlZCByZWdleCBmb3IgcmVtb3ZpbmcgYSB0cmFpbGluZyBzbGFzaC5cbnZhciB0cmFpbGluZ1NsYXNoID0gL1xcLyQvO1xuXG4vLyBDYWNoZWQgcmVnZXggZm9yIHN0cmlwcGluZyB1cmxzIG9mIGhhc2ggYW5kIHF1ZXJ5LlxudmFyIHBhdGhTdHJpcHBlciA9IC9bI10uKiQvO1xuXG4vLyBIYXMgdGhlIGhpc3RvcnkgaGFuZGxpbmcgYWxyZWFkeSBiZWVuIHN0YXJ0ZWQ/XG5IaXN0b3J5LnN0YXJ0ZWQgPSBmYWxzZTtcblxuLy8gU2V0IHVwIGFsbCBpbmhlcml0YWJsZSAqKkJhY2tib25lLkhpc3RvcnkqKiBwcm9wZXJ0aWVzIGFuZCBtZXRob2RzLlxuXy5leHRlbmQoSGlzdG9yeS5wcm90b3R5cGUsIEV2ZW50cywge1xuXG4gIC8vIEFyZSB3ZSBhdCB0aGUgYXBwIHJvb3Q/XG4gIGF0Um9vdDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMubG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvW15cXC9dJC8sICckJi8nKSA9PT0gdGhpcy5yb290O1xuICB9LFxuXG4gIC8vIEdldHMgdGhlIHRydWUgaGFzaCB2YWx1ZS4gQ2Fubm90IHVzZSBsb2NhdGlvbi5oYXNoIGRpcmVjdGx5IGR1ZSB0byBidWdcbiAgLy8gaW4gRmlyZWZveCB3aGVyZSBsb2NhdGlvbi5oYXNoIHdpbGwgYWx3YXlzIGJlIGRlY29kZWQuXG4gIGdldEhhc2g6IGZ1bmN0aW9uKHdpbmRvdykge1xuICAgIHZhciBtYXRjaCA9ICh3aW5kb3cgfHwgdGhpcykubG9jYXRpb24uaHJlZi5tYXRjaCgvIyguKikkLyk7XG4gICAgcmV0dXJuIG1hdGNoID8gbWF0Y2hbMV0gOiAnJztcbiAgfSxcblxuICAvLyBHZXQgdGhlIGNyb3NzLWJyb3dzZXIgbm9ybWFsaXplZCBVUkwgZnJhZ21lbnQsIGVpdGhlciBmcm9tIHRoZSBVUkwsXG4gIC8vIHRoZSBoYXNoLCBvciB0aGUgb3ZlcnJpZGUuXG4gIGdldEZyYWdtZW50OiBmdW5jdGlvbihmcmFnbWVudCwgZm9yY2VQdXNoU3RhdGUpIHtcbiAgICBpZiAoZnJhZ21lbnQgPT0gbnVsbCkge1xuICAgICAgaWYgKHRoaXMuX3dhbnRzUHVzaFN0YXRlIHx8ICF0aGlzLl93YW50c0hhc2hDaGFuZ2UpIHtcbiAgICAgICAgZnJhZ21lbnQgPSBkZWNvZGVVUkkodGhpcy5sb2NhdGlvbi5wYXRobmFtZSArIHRoaXMubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgdmFyIHJvb3QgPSB0aGlzLnJvb3QucmVwbGFjZSh0cmFpbGluZ1NsYXNoLCAnJyk7XG4gICAgICAgIGlmICghZnJhZ21lbnQuaW5kZXhPZihyb290KSkgZnJhZ21lbnQgPSBmcmFnbWVudC5zbGljZShyb290Lmxlbmd0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmcmFnbWVudCA9IHRoaXMuZ2V0SGFzaCgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZnJhZ21lbnQucmVwbGFjZShyb3V0ZVN0cmlwcGVyLCAnJyk7XG4gIH0sXG5cbiAgLy8gU3RhcnQgdGhlIGhhc2ggY2hhbmdlIGhhbmRsaW5nLCByZXR1cm5pbmcgYHRydWVgIGlmIHRoZSBjdXJyZW50IFVSTCBtYXRjaGVzXG4gIC8vIGFuIGV4aXN0aW5nIHJvdXRlLCBhbmQgYGZhbHNlYCBvdGhlcndpc2UuXG4gIHN0YXJ0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgaWYgKEhpc3Rvcnkuc3RhcnRlZCkgdGhyb3cgbmV3IEVycm9yKFwiQmFja2JvbmUuaGlzdG9yeSBoYXMgYWxyZWFkeSBiZWVuIHN0YXJ0ZWRcIik7XG4gICAgSGlzdG9yeS5zdGFydGVkID0gdHJ1ZTtcblxuICAgIC8vIEZpZ3VyZSBvdXQgdGhlIGluaXRpYWwgY29uZmlndXJhdGlvbi5cbiAgICAvLyBJcyBwdXNoU3RhdGUgZGVzaXJlZCBvciBzaG91bGQgd2UgdXNlIGhhc2hjaGFuZ2Ugb25seT9cbiAgICB0aGlzLm9wdGlvbnMgICAgICAgICAgPSBfLmV4dGVuZCh7cm9vdDogJy8nfSwgdGhpcy5vcHRpb25zLCBvcHRpb25zKTtcbiAgICB0aGlzLnJvb3QgICAgICAgICAgICAgPSB0aGlzLm9wdGlvbnMucm9vdDtcbiAgICB0aGlzLl93YW50c0hhc2hDaGFuZ2UgPSB0aGlzLm9wdGlvbnMuaGFzaENoYW5nZSAhPT0gZmFsc2U7XG4gICAgdGhpcy5fd2FudHNQdXNoU3RhdGUgID0gISF0aGlzLm9wdGlvbnMucHVzaFN0YXRlO1xuICAgIHZhciBmcmFnbWVudCAgICAgICAgICA9IHRoaXMuZ2V0RnJhZ21lbnQoKTtcblxuICAgIC8vIE5vcm1hbGl6ZSByb290IHRvIGFsd2F5cyBpbmNsdWRlIGEgbGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2guXG4gICAgdGhpcy5yb290ID0gKCcvJyArIHRoaXMucm9vdCArICcvJykucmVwbGFjZShyb290U3RyaXBwZXIsICcvJyk7XG5cbiAgICAvLyBEZXBlbmRpbmcgb24gd2hldGhlciB3ZSdyZSB1c2luZyBwdXNoU3RhdGUgb3IgaGFzaGVzLCBkZXRlcm1pbmUgaG93IHdlXG4gICAgLy8gY2hlY2sgdGhlIFVSTCBzdGF0ZS5cbiAgICBpZiAodGhpcy5fd2FudHNQdXNoU3RhdGUpIHtcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuY2hlY2tVcmwsIGZhbHNlKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuX3dhbnRzSGFzaENoYW5nZSkge1xuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2hhc2hjaGFuZ2UnLCB0aGlzLmNoZWNrVXJsLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgLy8gRGV0ZXJtaW5lIGlmIHdlIG5lZWQgdG8gY2hhbmdlIHRoZSBiYXNlIHVybCwgZm9yIGEgcHVzaFN0YXRlIGxpbmtcbiAgICAvLyBvcGVuZWQgYnkgYSBub24tcHVzaFN0YXRlIGJyb3dzZXIuXG4gICAgdGhpcy5mcmFnbWVudCA9IGZyYWdtZW50O1xuICAgIHZhciBsb2MgPSB0aGlzLmxvY2F0aW9uO1xuXG4gICAgLy8gVHJhbnNpdGlvbiBmcm9tIGhhc2hDaGFuZ2UgdG8gcHVzaFN0YXRlIG9yIHZpY2UgdmVyc2EgaWYgYm90aCBhcmVcbiAgICAvLyByZXF1ZXN0ZWQuXG4gICAgaWYgKHRoaXMuX3dhbnRzSGFzaENoYW5nZSAmJiB0aGlzLl93YW50c1B1c2hTdGF0ZSkge1xuXG4gICAgICAvLyBJZiB3ZSd2ZSBzdGFydGVkIG91dCB3aXRoIGEgaGFzaC1iYXNlZCByb3V0ZSwgYnV0IHdlJ3JlIGN1cnJlbnRseVxuICAgICAgLy8gaW4gYSBicm93c2VyIHdoZXJlIGl0IGNvdWxkIGJlIGBwdXNoU3RhdGVgLWJhc2VkIGluc3RlYWQuLi5cbiAgICAgIGlmICh0aGlzLmF0Um9vdCgpICYmIGxvYy5oYXNoKSB7XG4gICAgICAgIHRoaXMuZnJhZ21lbnQgPSB0aGlzLmdldEhhc2goKS5yZXBsYWNlKHJvdXRlU3RyaXBwZXIsICcnKTtcbiAgICAgICAgdGhpcy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh7fSwgZG9jdW1lbnQudGl0bGUsIHRoaXMucm9vdCArIHRoaXMuZnJhZ21lbnQpO1xuICAgICAgfVxuXG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuc2lsZW50KSByZXR1cm4gdGhpcy5sb2FkVXJsKCk7XG4gIH0sXG5cbiAgLy8gRGlzYWJsZSBCYWNrYm9uZS5oaXN0b3J5LCBwZXJoYXBzIHRlbXBvcmFyaWx5LiBOb3QgdXNlZnVsIGluIGEgcmVhbCBhcHAsXG4gIC8vIGJ1dCBwb3NzaWJseSB1c2VmdWwgZm9yIHVuaXQgdGVzdGluZyBSb3V0ZXJzLlxuICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLmNoZWNrVXJsKTtcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignaGFzaGNoYW5nZScsIHRoaXMuY2hlY2tVcmwpO1xuICAgIEhpc3Rvcnkuc3RhcnRlZCA9IGZhbHNlO1xuICB9LFxuXG4gIC8vIEFkZCBhIHJvdXRlIHRvIGJlIHRlc3RlZCB3aGVuIHRoZSBmcmFnbWVudCBjaGFuZ2VzLiBSb3V0ZXMgYWRkZWQgbGF0ZXJcbiAgLy8gbWF5IG92ZXJyaWRlIHByZXZpb3VzIHJvdXRlcy5cbiAgcm91dGU6IGZ1bmN0aW9uKHJvdXRlLCBjYWxsYmFjaykge1xuICAgIHRoaXMuaGFuZGxlcnMudW5zaGlmdCh7cm91dGU6IHJvdXRlLCBjYWxsYmFjazogY2FsbGJhY2t9KTtcbiAgfSxcblxuICAvLyBDaGVja3MgdGhlIGN1cnJlbnQgVVJMIHRvIHNlZSBpZiBpdCBoYXMgY2hhbmdlZCwgYW5kIGlmIGl0IGhhcyxcbiAgLy8gY2FsbHMgYGxvYWRVcmxgLlxuICBjaGVja1VybDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGN1cnJlbnQgPSB0aGlzLmdldEZyYWdtZW50KCk7XG4gICAgaWYgKGN1cnJlbnQgPT09IHRoaXMuZnJhZ21lbnQpIHJldHVybiBmYWxzZTtcbiAgICB0aGlzLmxvYWRVcmwoKTtcbiAgfSxcblxuICAvLyBBdHRlbXB0IHRvIGxvYWQgdGhlIGN1cnJlbnQgVVJMIGZyYWdtZW50LiBJZiBhIHJvdXRlIHN1Y2NlZWRzIHdpdGggYVxuICAvLyBtYXRjaCwgcmV0dXJucyBgdHJ1ZWAuIElmIG5vIGRlZmluZWQgcm91dGVzIG1hdGNoZXMgdGhlIGZyYWdtZW50LFxuICAvLyByZXR1cm5zIGBmYWxzZWAuXG4gIGxvYWRVcmw6IGZ1bmN0aW9uKGZyYWdtZW50KSB7XG4gICAgZnJhZ21lbnQgPSB0aGlzLmZyYWdtZW50ID0gdGhpcy5nZXRGcmFnbWVudChmcmFnbWVudCk7XG4gICAgcmV0dXJuIHRoaXMuaGFuZGxlcnMuc29tZShmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICBpZiAoaGFuZGxlci5yb3V0ZS50ZXN0KGZyYWdtZW50KSkge1xuICAgICAgICBoYW5kbGVyLmNhbGxiYWNrKGZyYWdtZW50KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gU2F2ZSBhIGZyYWdtZW50IGludG8gdGhlIGhhc2ggaGlzdG9yeSwgb3IgcmVwbGFjZSB0aGUgVVJMIHN0YXRlIGlmIHRoZVxuICAvLyAncmVwbGFjZScgb3B0aW9uIGlzIHBhc3NlZC4gWW91IGFyZSByZXNwb25zaWJsZSBmb3IgcHJvcGVybHkgVVJMLWVuY29kaW5nXG4gIC8vIHRoZSBmcmFnbWVudCBpbiBhZHZhbmNlLlxuICAvL1xuICAvLyBUaGUgb3B0aW9ucyBvYmplY3QgY2FuIGNvbnRhaW4gYHRyaWdnZXI6IHRydWVgIGlmIHlvdSB3aXNoIHRvIGhhdmUgdGhlXG4gIC8vIHJvdXRlIGNhbGxiYWNrIGJlIGZpcmVkIChub3QgdXN1YWxseSBkZXNpcmFibGUpLCBvciBgcmVwbGFjZTogdHJ1ZWAsIGlmXG4gIC8vIHlvdSB3aXNoIHRvIG1vZGlmeSB0aGUgY3VycmVudCBVUkwgd2l0aG91dCBhZGRpbmcgYW4gZW50cnkgdG8gdGhlIGhpc3RvcnkuXG4gIG5hdmlnYXRlOiBmdW5jdGlvbihmcmFnbWVudCwgb3B0aW9ucykge1xuICAgIGlmICghSGlzdG9yeS5zdGFydGVkKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFvcHRpb25zIHx8IG9wdGlvbnMgPT09IHRydWUpIG9wdGlvbnMgPSB7dHJpZ2dlcjogISFvcHRpb25zfTtcblxuICAgIHZhciB1cmwgPSB0aGlzLnJvb3QgKyAoZnJhZ21lbnQgPSB0aGlzLmdldEZyYWdtZW50KGZyYWdtZW50IHx8ICcnKSk7XG5cbiAgICAvLyBTdHJpcCB0aGUgaGFzaCBmb3IgbWF0Y2hpbmcuXG4gICAgZnJhZ21lbnQgPSBmcmFnbWVudC5yZXBsYWNlKHBhdGhTdHJpcHBlciwgJycpO1xuXG4gICAgaWYgKHRoaXMuZnJhZ21lbnQgPT09IGZyYWdtZW50KSByZXR1cm47XG4gICAgdGhpcy5mcmFnbWVudCA9IGZyYWdtZW50O1xuXG4gICAgLy8gRG9uJ3QgaW5jbHVkZSBhIHRyYWlsaW5nIHNsYXNoIG9uIHRoZSByb290LlxuICAgIGlmIChmcmFnbWVudCA9PT0gJycgJiYgdXJsICE9PSAnLycpIHVybCA9IHVybC5zbGljZSgwLCAtMSk7XG5cbiAgICAvLyBJZiB3ZSdyZSB1c2luZyBwdXNoU3RhdGUgd2UgdXNlIGl0IHRvIHNldCB0aGUgZnJhZ21lbnQgYXMgYSByZWFsIFVSTC5cbiAgICBpZiAodGhpcy5fd2FudHNQdXNoU3RhdGUpIHtcbiAgICAgIHRoaXMuaGlzdG9yeVtvcHRpb25zLnJlcGxhY2UgPyAncmVwbGFjZVN0YXRlJyA6ICdwdXNoU3RhdGUnXSh7fSwgZG9jdW1lbnQudGl0bGUsIHVybCk7XG5cbiAgICAvLyBJZiBoYXNoIGNoYW5nZXMgaGF2ZW4ndCBiZWVuIGV4cGxpY2l0bHkgZGlzYWJsZWQsIHVwZGF0ZSB0aGUgaGFzaFxuICAgIC8vIGZyYWdtZW50IHRvIHN0b3JlIGhpc3RvcnkuXG4gICAgfSBlbHNlIGlmICh0aGlzLl93YW50c0hhc2hDaGFuZ2UpIHtcbiAgICAgIHRoaXMuX3VwZGF0ZUhhc2godGhpcy5sb2NhdGlvbiwgZnJhZ21lbnQsIG9wdGlvbnMucmVwbGFjZSk7XG4gICAgLy8gSWYgeW91J3ZlIHRvbGQgdXMgdGhhdCB5b3UgZXhwbGljaXRseSBkb24ndCB3YW50IGZhbGxiYWNrIGhhc2hjaGFuZ2UtXG4gICAgLy8gYmFzZWQgaGlzdG9yeSwgdGhlbiBgbmF2aWdhdGVgIGJlY29tZXMgYSBwYWdlIHJlZnJlc2guXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmxvY2F0aW9uLmFzc2lnbih1cmwpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy50cmlnZ2VyKSByZXR1cm4gdGhpcy5sb2FkVXJsKGZyYWdtZW50KTtcbiAgfSxcblxuICAvLyBVcGRhdGUgdGhlIGhhc2ggbG9jYXRpb24sIGVpdGhlciByZXBsYWNpbmcgdGhlIGN1cnJlbnQgZW50cnksIG9yIGFkZGluZ1xuICAvLyBhIG5ldyBvbmUgdG8gdGhlIGJyb3dzZXIgaGlzdG9yeS5cbiAgX3VwZGF0ZUhhc2g6IGZ1bmN0aW9uKGxvY2F0aW9uLCBmcmFnbWVudCwgcmVwbGFjZSkge1xuICAgIGlmIChyZXBsYWNlKSB7XG4gICAgICB2YXIgaHJlZiA9IGxvY2F0aW9uLmhyZWYucmVwbGFjZSgvKGphdmFzY3JpcHQ6fCMpLiokLywgJycpO1xuICAgICAgbG9jYXRpb24ucmVwbGFjZShocmVmICsgJyMnICsgZnJhZ21lbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTb21lIGJyb3dzZXJzIHJlcXVpcmUgdGhhdCBgaGFzaGAgY29udGFpbnMgYSBsZWFkaW5nICMuXG4gICAgICBsb2NhdGlvbi5oYXNoID0gJyMnICsgZnJhZ21lbnQ7XG4gICAgfVxuICB9XG5cbn0pO1xuICAvLyAhISFcbiAgLy8gSW5pdC5cbiAgWydNb2RlbCcsICdDb2xsZWN0aW9uJywgJ1JvdXRlcicsICdWaWV3JywgJ0hpc3RvcnknXS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgaXRlbSA9IEJhY2tib25lW25hbWVdO1xuICAgIGlmIChpdGVtKSBpdGVtLmV4dGVuZCA9IEJhY2tib25lLmV4dGVuZDtcbiAgfSk7XG5cbiAgLy8gQWxsb3cgdGhlIGBCYWNrYm9uZWAgb2JqZWN0IHRvIHNlcnZlIGFzIGEgZ2xvYmFsIGV2ZW50IGJ1cywgZm9yIGZvbGtzIHdob1xuICAvLyB3YW50IGdsb2JhbCBcInB1YnN1YlwiIGluIGEgY29udmVuaWVudCBwbGFjZS5cbiAgXy5leHRlbmQoQmFja2JvbmUsIEV2ZW50cyk7XG5cbiAgLy8gQ3JlYXRlIHRoZSBkZWZhdWx0IEJhY2tib25lLmhpc3RvcnkgaWYgdGhlIEhpc3RvcnkgbW9kdWxlIGlzIGluY2x1ZGVkLlxuICBpZiAoSGlzdG9yeSkgQmFja2JvbmUuaGlzdG9yeSA9IG5ldyBIaXN0b3J5KCk7XG4gIHJldHVybiBCYWNrYm9uZTtcbn0pO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG4vKmdsb2JhbHMgSGFuZGxlYmFyczogdHJ1ZSAqL1xudmFyIGJhc2UgPSByZXF1aXJlKFwiLi9oYW5kbGViYXJzL2Jhc2VcIik7XG5cbi8vIEVhY2ggb2YgdGhlc2UgYXVnbWVudCB0aGUgSGFuZGxlYmFycyBvYmplY3QuIE5vIG5lZWQgdG8gc2V0dXAgaGVyZS5cbi8vIChUaGlzIGlzIGRvbmUgdG8gZWFzaWx5IHNoYXJlIGNvZGUgYmV0d2VlbiBjb21tb25qcyBhbmQgYnJvd3NlIGVudnMpXG52YXIgU2FmZVN0cmluZyA9IHJlcXVpcmUoXCIuL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmdcIilbXCJkZWZhdWx0XCJdO1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuL2hhbmRsZWJhcnMvZXhjZXB0aW9uXCIpW1wiZGVmYXVsdFwiXTtcbnZhciBVdGlscyA9IHJlcXVpcmUoXCIuL2hhbmRsZWJhcnMvdXRpbHNcIik7XG52YXIgcnVudGltZSA9IHJlcXVpcmUoXCIuL2hhbmRsZWJhcnMvcnVudGltZVwiKTtcblxuLy8gRm9yIGNvbXBhdGliaWxpdHkgYW5kIHVzYWdlIG91dHNpZGUgb2YgbW9kdWxlIHN5c3RlbXMsIG1ha2UgdGhlIEhhbmRsZWJhcnMgb2JqZWN0IGEgbmFtZXNwYWNlXG52YXIgY3JlYXRlID0gZnVuY3Rpb24oKSB7XG4gIHZhciBoYiA9IG5ldyBiYXNlLkhhbmRsZWJhcnNFbnZpcm9ubWVudCgpO1xuXG4gIFV0aWxzLmV4dGVuZChoYiwgYmFzZSk7XG4gIGhiLlNhZmVTdHJpbmcgPSBTYWZlU3RyaW5nO1xuICBoYi5FeGNlcHRpb24gPSBFeGNlcHRpb247XG4gIGhiLlV0aWxzID0gVXRpbHM7XG5cbiAgaGIuVk0gPSBydW50aW1lO1xuICBoYi50ZW1wbGF0ZSA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICByZXR1cm4gcnVudGltZS50ZW1wbGF0ZShzcGVjLCBoYik7XG4gIH07XG5cbiAgcmV0dXJuIGhiO1xufTtcblxudmFyIEhhbmRsZWJhcnMgPSBjcmVhdGUoKTtcbkhhbmRsZWJhcnMuY3JlYXRlID0gY3JlYXRlO1xuXG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IEhhbmRsZWJhcnM7IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgVXRpbHMgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcbnZhciBFeGNlcHRpb24gPSByZXF1aXJlKFwiLi9leGNlcHRpb25cIilbXCJkZWZhdWx0XCJdO1xuXG52YXIgVkVSU0lPTiA9IFwiMS4zLjBcIjtcbmV4cG9ydHMuVkVSU0lPTiA9IFZFUlNJT047dmFyIENPTVBJTEVSX1JFVklTSU9OID0gNDtcbmV4cG9ydHMuQ09NUElMRVJfUkVWSVNJT04gPSBDT01QSUxFUl9SRVZJU0lPTjtcbnZhciBSRVZJU0lPTl9DSEFOR0VTID0ge1xuICAxOiAnPD0gMS4wLnJjLjInLCAvLyAxLjAucmMuMiBpcyBhY3R1YWxseSByZXYyIGJ1dCBkb2Vzbid0IHJlcG9ydCBpdFxuICAyOiAnPT0gMS4wLjAtcmMuMycsXG4gIDM6ICc9PSAxLjAuMC1yYy40JyxcbiAgNDogJz49IDEuMC4wJ1xufTtcbmV4cG9ydHMuUkVWSVNJT05fQ0hBTkdFUyA9IFJFVklTSU9OX0NIQU5HRVM7XG52YXIgaXNBcnJheSA9IFV0aWxzLmlzQXJyYXksXG4gICAgaXNGdW5jdGlvbiA9IFV0aWxzLmlzRnVuY3Rpb24sXG4gICAgdG9TdHJpbmcgPSBVdGlscy50b1N0cmluZyxcbiAgICBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbmZ1bmN0aW9uIEhhbmRsZWJhcnNFbnZpcm9ubWVudChoZWxwZXJzLCBwYXJ0aWFscykge1xuICB0aGlzLmhlbHBlcnMgPSBoZWxwZXJzIHx8IHt9O1xuICB0aGlzLnBhcnRpYWxzID0gcGFydGlhbHMgfHwge307XG5cbiAgcmVnaXN0ZXJEZWZhdWx0SGVscGVycyh0aGlzKTtcbn1cblxuZXhwb3J0cy5IYW5kbGViYXJzRW52aXJvbm1lbnQgPSBIYW5kbGViYXJzRW52aXJvbm1lbnQ7SGFuZGxlYmFyc0Vudmlyb25tZW50LnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IEhhbmRsZWJhcnNFbnZpcm9ubWVudCxcblxuICBsb2dnZXI6IGxvZ2dlcixcbiAgbG9nOiBsb2csXG5cbiAgcmVnaXN0ZXJIZWxwZXI6IGZ1bmN0aW9uKG5hbWUsIGZuLCBpbnZlcnNlKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIGlmIChpbnZlcnNlIHx8IGZuKSB7IHRocm93IG5ldyBFeGNlcHRpb24oJ0FyZyBub3Qgc3VwcG9ydGVkIHdpdGggbXVsdGlwbGUgaGVscGVycycpOyB9XG4gICAgICBVdGlscy5leHRlbmQodGhpcy5oZWxwZXJzLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGludmVyc2UpIHsgZm4ubm90ID0gaW52ZXJzZTsgfVxuICAgICAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm47XG4gICAgfVxuICB9LFxuXG4gIHJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24obmFtZSwgc3RyKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIFV0aWxzLmV4dGVuZCh0aGlzLnBhcnRpYWxzLCAgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucGFydGlhbHNbbmFtZV0gPSBzdHI7XG4gICAgfVxuICB9XG59O1xuXG5mdW5jdGlvbiByZWdpc3RlckRlZmF1bHRIZWxwZXJzKGluc3RhbmNlKSB7XG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdoZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oYXJnKSB7XG4gICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIk1pc3NpbmcgaGVscGVyOiAnXCIgKyBhcmcgKyBcIidcIik7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlIHx8IGZ1bmN0aW9uKCkge30sIGZuID0gb3B0aW9ucy5mbjtcblxuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICAgIGlmKGNvbnRleHQgPT09IHRydWUpIHtcbiAgICAgIHJldHVybiBmbih0aGlzKTtcbiAgICB9IGVsc2UgaWYoY29udGV4dCA9PT0gZmFsc2UgfHwgY29udGV4dCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgIGlmKGNvbnRleHQubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVycy5lYWNoKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmbihjb250ZXh0KTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBmbiA9IG9wdGlvbnMuZm4sIGludmVyc2UgPSBvcHRpb25zLmludmVyc2U7XG4gICAgdmFyIGkgPSAwLCByZXQgPSBcIlwiLCBkYXRhO1xuXG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgICAgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgfVxuXG4gICAgaWYoY29udGV4dCAmJiB0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICAgIGZvcih2YXIgaiA9IGNvbnRleHQubGVuZ3RoOyBpPGo7IGkrKykge1xuICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICBkYXRhLmluZGV4ID0gaTtcbiAgICAgICAgICAgIGRhdGEuZmlyc3QgPSAoaSA9PT0gMCk7XG4gICAgICAgICAgICBkYXRhLmxhc3QgID0gKGkgPT09IChjb250ZXh0Lmxlbmd0aC0xKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICAgIGlmKGNvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgaWYoZGF0YSkgeyBcbiAgICAgICAgICAgICAgZGF0YS5rZXkgPSBrZXk7IFxuICAgICAgICAgICAgICBkYXRhLmluZGV4ID0gaTtcbiAgICAgICAgICAgICAgZGF0YS5maXJzdCA9IChpID09PSAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRba2V5XSwge2RhdGE6IGRhdGF9KTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZihpID09PSAwKXtcbiAgICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjb25kaXRpb25hbCkpIHsgY29uZGl0aW9uYWwgPSBjb25kaXRpb25hbC5jYWxsKHRoaXMpOyB9XG5cbiAgICAvLyBEZWZhdWx0IGJlaGF2aW9yIGlzIHRvIHJlbmRlciB0aGUgcG9zaXRpdmUgcGF0aCBpZiB0aGUgdmFsdWUgaXMgdHJ1dGh5IGFuZCBub3QgZW1wdHkuXG4gICAgLy8gVGhlIGBpbmNsdWRlWmVyb2Agb3B0aW9uIG1heSBiZSBzZXQgdG8gdHJlYXQgdGhlIGNvbmR0aW9uYWwgYXMgcHVyZWx5IG5vdCBlbXB0eSBiYXNlZCBvbiB0aGVcbiAgICAvLyBiZWhhdmlvciBvZiBpc0VtcHR5LiBFZmZlY3RpdmVseSB0aGlzIGRldGVybWluZXMgaWYgMCBpcyBoYW5kbGVkIGJ5IHRoZSBwb3NpdGl2ZSBwYXRoIG9yIG5lZ2F0aXZlLlxuICAgIGlmICgoIW9wdGlvbnMuaGFzaC5pbmNsdWRlWmVybyAmJiAhY29uZGl0aW9uYWwpIHx8IFV0aWxzLmlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd1bmxlc3MnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzWydpZiddLmNhbGwodGhpcywgY29uZGl0aW9uYWwsIHtmbjogb3B0aW9ucy5pbnZlcnNlLCBpbnZlcnNlOiBvcHRpb25zLmZuLCBoYXNoOiBvcHRpb25zLmhhc2h9KTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgaWYgKCFVdGlscy5pc0VtcHR5KGNvbnRleHQpKSByZXR1cm4gb3B0aW9ucy5mbihjb250ZXh0KTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgbGV2ZWwgPSBvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhLmxldmVsICE9IG51bGwgPyBwYXJzZUludChvcHRpb25zLmRhdGEubGV2ZWwsIDEwKSA6IDE7XG4gICAgaW5zdGFuY2UubG9nKGxldmVsLCBjb250ZXh0KTtcbiAgfSk7XG59XG5cbnZhciBsb2dnZXIgPSB7XG4gIG1ldGhvZE1hcDogeyAwOiAnZGVidWcnLCAxOiAnaW5mbycsIDI6ICd3YXJuJywgMzogJ2Vycm9yJyB9LFxuXG4gIC8vIFN0YXRlIGVudW1cbiAgREVCVUc6IDAsXG4gIElORk86IDEsXG4gIFdBUk46IDIsXG4gIEVSUk9SOiAzLFxuICBsZXZlbDogMyxcblxuICAvLyBjYW4gYmUgb3ZlcnJpZGRlbiBpbiB0aGUgaG9zdCBlbnZpcm9ubWVudFxuICBsb2c6IGZ1bmN0aW9uKGxldmVsLCBvYmopIHtcbiAgICBpZiAobG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gbG9nZ2VyLm1ldGhvZE1hcFtsZXZlbF07XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGVbbWV0aG9kXSkge1xuICAgICAgICBjb25zb2xlW21ldGhvZF0uY2FsbChjb25zb2xlLCBvYmopO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcbmV4cG9ydHMubG9nZ2VyID0gbG9nZ2VyO1xuZnVuY3Rpb24gbG9nKGxldmVsLCBvYmopIHsgbG9nZ2VyLmxvZyhsZXZlbCwgb2JqKTsgfVxuXG5leHBvcnRzLmxvZyA9IGxvZzt2YXIgY3JlYXRlRnJhbWUgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgdmFyIG9iaiA9IHt9O1xuICBVdGlscy5leHRlbmQob2JqLCBvYmplY3QpO1xuICByZXR1cm4gb2JqO1xufTtcbmV4cG9ydHMuY3JlYXRlRnJhbWUgPSBjcmVhdGVGcmFtZTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGVycm9yUHJvcHMgPSBbJ2Rlc2NyaXB0aW9uJywgJ2ZpbGVOYW1lJywgJ2xpbmVOdW1iZXInLCAnbWVzc2FnZScsICduYW1lJywgJ251bWJlcicsICdzdGFjayddO1xuXG5mdW5jdGlvbiBFeGNlcHRpb24obWVzc2FnZSwgbm9kZSkge1xuICB2YXIgbGluZTtcbiAgaWYgKG5vZGUgJiYgbm9kZS5maXJzdExpbmUpIHtcbiAgICBsaW5lID0gbm9kZS5maXJzdExpbmU7XG5cbiAgICBtZXNzYWdlICs9ICcgLSAnICsgbGluZSArICc6JyArIG5vZGUuZmlyc3RDb2x1bW47XG4gIH1cblxuICB2YXIgdG1wID0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yLmNhbGwodGhpcywgbWVzc2FnZSk7XG5cbiAgLy8gVW5mb3J0dW5hdGVseSBlcnJvcnMgYXJlIG5vdCBlbnVtZXJhYmxlIGluIENocm9tZSAoYXQgbGVhc3QpLCBzbyBgZm9yIHByb3AgaW4gdG1wYCBkb2Vzbid0IHdvcmsuXG4gIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXNbZXJyb3JQcm9wc1tpZHhdXSA9IHRtcFtlcnJvclByb3BzW2lkeF1dO1xuICB9XG5cbiAgaWYgKGxpbmUpIHtcbiAgICB0aGlzLmxpbmVOdW1iZXIgPSBsaW5lO1xuICAgIHRoaXMuY29sdW1uID0gbm9kZS5maXJzdENvbHVtbjtcbiAgfVxufVxuXG5FeGNlcHRpb24ucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gRXhjZXB0aW9uOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIFV0aWxzID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG52YXIgRXhjZXB0aW9uID0gcmVxdWlyZShcIi4vZXhjZXB0aW9uXCIpW1wiZGVmYXVsdFwiXTtcbnZhciBDT01QSUxFUl9SRVZJU0lPTiA9IHJlcXVpcmUoXCIuL2Jhc2VcIikuQ09NUElMRVJfUkVWSVNJT047XG52YXIgUkVWSVNJT05fQ0hBTkdFUyA9IHJlcXVpcmUoXCIuL2Jhc2VcIikuUkVWSVNJT05fQ0hBTkdFUztcblxuZnVuY3Rpb24gY2hlY2tSZXZpc2lvbihjb21waWxlckluZm8pIHtcbiAgdmFyIGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm8gJiYgY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICBjdXJyZW50UmV2aXNpb24gPSBDT01QSUxFUl9SRVZJU0lPTjtcblxuICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XG4gICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgPSBSRVZJU0lPTl9DSEFOR0VTW2N1cnJlbnRSZXZpc2lvbl0sXG4gICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYW4gb2xkZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBwcmVjb21waWxlciB0byBhIG5ld2VyIHZlcnNpb24gKFwiK3J1bnRpbWVWZXJzaW9ucytcIikgb3IgZG93bmdyYWRlIHlvdXIgcnVudGltZSB0byBhbiBvbGRlciB2ZXJzaW9uIChcIitjb21waWxlclZlcnNpb25zK1wiKS5cIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFVzZSB0aGUgZW1iZWRkZWQgdmVyc2lvbiBpbmZvIHNpbmNlIHRoZSBydW50aW1lIGRvZXNuJ3Qga25vdyBhYm91dCB0aGlzIHJldmlzaW9uIHlldFxuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGEgbmV3ZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJJbmZvWzFdK1wiKS5cIik7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydHMuY2hlY2tSZXZpc2lvbiA9IGNoZWNrUmV2aXNpb247Ly8gVE9ETzogUmVtb3ZlIHRoaXMgbGluZSBhbmQgYnJlYWsgdXAgY29tcGlsZVBhcnRpYWxcblxuZnVuY3Rpb24gdGVtcGxhdGUodGVtcGxhdGVTcGVjLCBlbnYpIHtcbiAgaWYgKCFlbnYpIHtcbiAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiTm8gZW52aXJvbm1lbnQgcGFzc2VkIHRvIHRlbXBsYXRlXCIpO1xuICB9XG5cbiAgLy8gTm90ZTogVXNpbmcgZW52LlZNIHJlZmVyZW5jZXMgcmF0aGVyIHRoYW4gbG9jYWwgdmFyIHJlZmVyZW5jZXMgdGhyb3VnaG91dCB0aGlzIHNlY3Rpb24gdG8gYWxsb3dcbiAgLy8gZm9yIGV4dGVybmFsIHVzZXJzIHRvIG92ZXJyaWRlIHRoZXNlIGFzIHBzdWVkby1zdXBwb3J0ZWQgQVBJcy5cbiAgdmFyIGludm9rZVBhcnRpYWxXcmFwcGVyID0gZnVuY3Rpb24ocGFydGlhbCwgbmFtZSwgY29udGV4dCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEpIHtcbiAgICB2YXIgcmVzdWx0ID0gZW52LlZNLmludm9rZVBhcnRpYWwuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAocmVzdWx0ICE9IG51bGwpIHsgcmV0dXJuIHJlc3VsdDsgfVxuXG4gICAgaWYgKGVudi5jb21waWxlKSB7XG4gICAgICB2YXIgb3B0aW9ucyA9IHsgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhIH07XG4gICAgICBwYXJ0aWFsc1tuYW1lXSA9IGVudi5jb21waWxlKHBhcnRpYWwsIHsgZGF0YTogZGF0YSAhPT0gdW5kZWZpbmVkIH0sIGVudik7XG4gICAgICByZXR1cm4gcGFydGlhbHNbbmFtZV0oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgY29tcGlsZWQgd2hlbiBydW5uaW5nIGluIHJ1bnRpbWUtb25seSBtb2RlXCIpO1xuICAgIH1cbiAgfTtcblxuICAvLyBKdXN0IGFkZCB3YXRlclxuICB2YXIgY29udGFpbmVyID0ge1xuICAgIGVzY2FwZUV4cHJlc3Npb246IFV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgaW52b2tlUGFydGlhbDogaW52b2tlUGFydGlhbFdyYXBwZXIsXG4gICAgcHJvZ3JhbXM6IFtdLFxuICAgIHByb2dyYW06IGZ1bmN0aW9uKGksIGZuLCBkYXRhKSB7XG4gICAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldO1xuICAgICAgaWYoZGF0YSkge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHByb2dyYW0oaSwgZm4sIGRhdGEpO1xuICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldID0gcHJvZ3JhbShpLCBmbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gICAgfSxcbiAgICBtZXJnZTogZnVuY3Rpb24ocGFyYW0sIGNvbW1vbikge1xuICAgICAgdmFyIHJldCA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgICAgaWYgKHBhcmFtICYmIGNvbW1vbiAmJiAocGFyYW0gIT09IGNvbW1vbikpIHtcbiAgICAgICAgcmV0ID0ge307XG4gICAgICAgIFV0aWxzLmV4dGVuZChyZXQsIGNvbW1vbik7XG4gICAgICAgIFV0aWxzLmV4dGVuZChyZXQsIHBhcmFtKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcbiAgICBwcm9ncmFtV2l0aERlcHRoOiBlbnYuVk0ucHJvZ3JhbVdpdGhEZXB0aCxcbiAgICBub29wOiBlbnYuVk0ubm9vcCxcbiAgICBjb21waWxlckluZm86IG51bGxcbiAgfTtcblxuICByZXR1cm4gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBuYW1lc3BhY2UgPSBvcHRpb25zLnBhcnRpYWwgPyBvcHRpb25zIDogZW52LFxuICAgICAgICBoZWxwZXJzLFxuICAgICAgICBwYXJ0aWFscztcblxuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBoZWxwZXJzID0gb3B0aW9ucy5oZWxwZXJzO1xuICAgICAgcGFydGlhbHMgPSBvcHRpb25zLnBhcnRpYWxzO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gdGVtcGxhdGVTcGVjLmNhbGwoXG4gICAgICAgICAgY29udGFpbmVyLFxuICAgICAgICAgIG5hbWVzcGFjZSwgY29udGV4dCxcbiAgICAgICAgICBoZWxwZXJzLFxuICAgICAgICAgIHBhcnRpYWxzLFxuICAgICAgICAgIG9wdGlvbnMuZGF0YSk7XG5cbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgZW52LlZNLmNoZWNrUmV2aXNpb24oY29udGFpbmVyLmNvbXBpbGVySW5mbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn1cblxuZXhwb3J0cy50ZW1wbGF0ZSA9IHRlbXBsYXRlO2Z1bmN0aW9uIHByb2dyYW1XaXRoRGVwdGgoaSwgZm4sIGRhdGEgLyosICRkZXB0aCAqLykge1xuICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMyk7XG5cbiAgdmFyIHByb2cgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgW2NvbnRleHQsIG9wdGlvbnMuZGF0YSB8fCBkYXRhXS5jb25jYXQoYXJncykpO1xuICB9O1xuICBwcm9nLnByb2dyYW0gPSBpO1xuICBwcm9nLmRlcHRoID0gYXJncy5sZW5ndGg7XG4gIHJldHVybiBwcm9nO1xufVxuXG5leHBvcnRzLnByb2dyYW1XaXRoRGVwdGggPSBwcm9ncmFtV2l0aERlcHRoO2Z1bmN0aW9uIHByb2dyYW0oaSwgZm4sIGRhdGEpIHtcbiAgdmFyIHByb2cgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGEpO1xuICB9O1xuICBwcm9nLnByb2dyYW0gPSBpO1xuICBwcm9nLmRlcHRoID0gMDtcbiAgcmV0dXJuIHByb2c7XG59XG5cbmV4cG9ydHMucHJvZ3JhbSA9IHByb2dyYW07ZnVuY3Rpb24gaW52b2tlUGFydGlhbChwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSkge1xuICB2YXIgb3B0aW9ucyA9IHsgcGFydGlhbDogdHJ1ZSwgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhIH07XG5cbiAgaWYocGFydGlhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBmb3VuZFwiKTtcbiAgfSBlbHNlIGlmKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICB9XG59XG5cbmV4cG9ydHMuaW52b2tlUGFydGlhbCA9IGludm9rZVBhcnRpYWw7ZnVuY3Rpb24gbm9vcCgpIHsgcmV0dXJuIFwiXCI7IH1cblxuZXhwb3J0cy5ub29wID0gbm9vcDsiLCJcInVzZSBzdHJpY3RcIjtcbi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5mdW5jdGlvbiBTYWZlU3RyaW5nKHN0cmluZykge1xuICB0aGlzLnN0cmluZyA9IHN0cmluZztcbn1cblxuU2FmZVN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFwiXCIgKyB0aGlzLnN0cmluZztcbn07XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gU2FmZVN0cmluZzsiLCJcInVzZSBzdHJpY3RcIjtcbi8qanNoaW50IC1XMDA0ICovXG52YXIgU2FmZVN0cmluZyA9IHJlcXVpcmUoXCIuL3NhZmUtc3RyaW5nXCIpW1wiZGVmYXVsdFwiXTtcblxudmFyIGVzY2FwZSA9IHtcbiAgXCImXCI6IFwiJmFtcDtcIixcbiAgXCI8XCI6IFwiJmx0O1wiLFxuICBcIj5cIjogXCImZ3Q7XCIsXG4gICdcIic6IFwiJnF1b3Q7XCIsXG4gIFwiJ1wiOiBcIiYjeDI3O1wiLFxuICBcImBcIjogXCImI3g2MDtcIlxufTtcblxudmFyIGJhZENoYXJzID0gL1smPD5cIidgXS9nO1xudmFyIHBvc3NpYmxlID0gL1smPD5cIidgXS87XG5cbmZ1bmN0aW9uIGVzY2FwZUNoYXIoY2hyKSB7XG4gIHJldHVybiBlc2NhcGVbY2hyXSB8fCBcIiZhbXA7XCI7XG59XG5cbmZ1bmN0aW9uIGV4dGVuZChvYmosIHZhbHVlKSB7XG4gIGZvcih2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgaWYoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbHVlLCBrZXkpKSB7XG4gICAgICBvYmpba2V5XSA9IHZhbHVlW2tleV07XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydHMuZXh0ZW5kID0gZXh0ZW5kO3ZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5leHBvcnRzLnRvU3RyaW5nID0gdG9TdHJpbmc7XG4vLyBTb3VyY2VkIGZyb20gbG9kYXNoXG4vLyBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvbG9kYXNoL2Jsb2IvbWFzdGVyL0xJQ0VOU0UudHh0XG52YXIgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbic7XG59O1xuLy8gZmFsbGJhY2sgZm9yIG9sZGVyIHZlcnNpb25zIG9mIENocm9tZSBhbmQgU2FmYXJpXG5pZiAoaXNGdW5jdGlvbigveC8pKSB7XG4gIGlzRnVuY3Rpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicgJiYgdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gIH07XG59XG52YXIgaXNGdW5jdGlvbjtcbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSA/IHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBBcnJheV0nIDogZmFsc2U7XG59O1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gZXNjYXBlRXhwcmVzc2lvbihzdHJpbmcpIHtcbiAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgU2FmZVN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmcudG9TdHJpbmcoKTtcbiAgfSBlbHNlIGlmICghc3RyaW5nICYmIHN0cmluZyAhPT0gMCkge1xuICAgIHJldHVybiBcIlwiO1xuICB9XG5cbiAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gIC8vIHRoZSByZWdleCB0ZXN0IHdpbGwgZG8gdGhpcyB0cmFuc3BhcmVudGx5IGJlaGluZCB0aGUgc2NlbmVzLCBjYXVzaW5nIGlzc3VlcyBpZlxuICAvLyBhbiBvYmplY3QncyB0byBzdHJpbmcgaGFzIGVzY2FwZWQgY2hhcmFjdGVycyBpbiBpdC5cbiAgc3RyaW5nID0gXCJcIiArIHN0cmluZztcblxuICBpZighcG9zc2libGUudGVzdChzdHJpbmcpKSB7IHJldHVybiBzdHJpbmc7IH1cbiAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKGJhZENoYXJzLCBlc2NhcGVDaGFyKTtcbn1cblxuZXhwb3J0cy5lc2NhcGVFeHByZXNzaW9uID0gZXNjYXBlRXhwcmVzc2lvbjtmdW5jdGlvbiBpc0VtcHR5KHZhbHVlKSB7XG4gIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0cy5pc0VtcHR5ID0gaXNFbXB0eTsiLCIvLyBDcmVhdGUgYSBzaW1wbGUgcGF0aCBhbGlhcyB0byBhbGxvdyBicm93c2VyaWZ5IHRvIHJlc29sdmVcbi8vIHRoZSBydW50aW1lIG9uIGEgc3VwcG9ydGVkIHBhdGguXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZGlzdC9janMvaGFuZGxlYmFycy5ydW50aW1lJyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJoYW5kbGViYXJzL3J1bnRpbWVcIilbXCJkZWZhdWx0XCJdO1xuIiwicmVxdWlyZShcImJhY2tib25lLm5hdGl2ZWFqYXhcIik7XG52YXIgRXhvc2tlbGV0b24gPSByZXF1aXJlKFwiZXhvc2tlbGV0b25cIik7XG5cbnZhciBCYXNlQ29sbGVjdGlvbiA9IEV4b3NrZWxldG9uLkNvbGxlY3Rpb24uZXh0ZW5kKHtcblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZUNvbGxlY3Rpb247IiwicmVxdWlyZShcImJhY2tib25lLm5hdGl2ZWFqYXhcIik7XG52YXIgRXhvc2tlbGV0b24gPSByZXF1aXJlKFwiZXhvc2tlbGV0b25cIik7XG5cbnZhciBCYXNlTW9kZWwgPSBFeG9za2VsZXRvbi5Nb2RlbC5leHRlbmQoe1xuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlTW9kZWw7IiwicmVxdWlyZShcImJhY2tib25lLm5hdGl2ZXZpZXdcIik7XG52YXIgRXhvc2tlbGV0b24gPSByZXF1aXJlKFwiZXhvc2tlbGV0b25cIik7XG5cbnZhciBCYXNlVmlldyA9IEV4b3NrZWxldG9uLk5hdGl2ZVZpZXcuZXh0ZW5kKHtcblxuICByZW5kZXJUZW1wbGF0ZTogZnVuY3Rpb24odGVtcGxhdGUsIGRhdGEpIHtcbiAgICBpZighZGF0YSAmJiB0eXBlb2YgdGVtcGxhdGUgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgIGRhdGEgPSB0ZW1wbGF0ZTtcbiAgICAgIHRlbXBsYXRlID0gdGhpcy50ZW1wbGF0ZTtcbiAgICB9IGVsc2UgaWYoIXRlbXBsYXRlKSB7XG4gICAgICB0ZW1wbGF0ZSA9IHRoaXMudGVtcGxhdGU7XG4gICAgfVxuXG4gICAgdGhpcy5lbC5pbm5lckhUTUwgPSB0ZW1wbGF0ZShkYXRhKTtcbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldzsiLCJ2YXIgQmFzZU1vZGVsID0gcmVxdWlyZShcIi4uL2Jhc2UvbW9kZWxcIik7XG5cbnZhciBBVkFJTEFCTEVfQ09MT1JTX0NPVU5UID0gMTc7XG5cbnZhciBnZXRSYW5kb21BcmJpdHJhcnkgPSBmdW5jdGlvbihtaW4sIG1heCkge1xuICAgIHJldHVybiBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbik7XG59O1xuXG5cbnZhciBDYXJkTW9kZWwgPSBCYXNlTW9kZWwuZXh0ZW5kKHtcblxuICBpZEF0dHJpYnV0ZTogXCJrZXlcIixcblxuICBkZWZhdWx0czoge1xuICAgIFwidGl0bGVcIjogXCJcIixcbiAgICBcImtleVwiOiBcIlwiLFxuICAgIFwiZGV0YWlsc1VybFwiOiBcIlwiXG4gIH0sXG5cbiAgZ2V0Q29sb3JJZDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbi5pbmRleE9mKHRoaXMpICUgQVZBSUxBQkxFX0NPTE9SU19DT1VOVDtcbiAgfSxcblxuICBnZXRJbXBvcnRhbmNlOiBmdW5jdGlvbihwaGFzZSkge1xuICAgIHZhciBpbXBvcnRhbmNlID0gdGhpcy5nZXQoXCJpbXBvcnRhbmNlXCIpO1xuXG4gICAgaWYodHlwZW9mIGltcG9ydGFuY2UgPT09IFwibnVtYmVyXCIpe1xuICAgICAgaW1wb3J0YW5jZSA9IHRoaXMuZ2VuZXJhdGVSYW5kb21JbXBvcnRhbmNlKCk7XG4gICAgICB0aGlzLnNldChcImltcG9ydGFuY2VcIiwgaW1wb3J0YW5jZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGltcG9ydGFuY2VbcGhhc2VdO1xuICB9LFxuXG4gIGdlbmVyYXRlUmFuZG9tSW1wb3J0YW5jZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFyciA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgNzsgaSsrKSB7XG4gICAgICBhcnIucHVzaChnZXRSYW5kb21BcmJpdHJhcnkoMCwgMikpO1xuICAgIH1cbiAgICByZXR1cm4gYXJyO1xuICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYXJkTW9kZWw7IiwidmFyIEJhc2VDb2xsZWN0aW9uID0gcmVxdWlyZShcIi4uL2Jhc2UvY29sbGVjdGlvblwiKTtcbnZhciBDYXJkTW9kZWwgPSByZXF1aXJlKFwiLi9jYXJkXCIpO1xuXG52YXIgQ2FyZENvbGxlY3Rpb24gPSBCYXNlQ29sbGVjdGlvbi5leHRlbmQoe1xuXG4gIG1vZGVsOiBDYXJkTW9kZWwsXG5cbiAgdXJsOiBcInJlc3Qva29ydFwiLFxuXG4gIGNvbXBhcmF0b3I6IFwidGl0bGVcIlxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYXJkQ29sbGVjdGlvbjsiLCJ2YXIgQmFzZVZpZXcgPSByZXF1aXJlKFwiLi4vYmFzZS92aWV3XCIpO1xudmFyIHRlbXBsYXRlID0gcmVxdWlyZShcIi4vdGVtcGxhdGUuaGJcIik7XG5cbnZhciBDYXJkRGV0YWlsc1ZpZXcgPSBCYXNlVmlldy5leHRlbmQoe1xuXG4gIGNsYXNzTmFtZTogXCJkZXRhaWxcIixcbiAgdGFnTmFtZTogXCJhcnRpY2xlXCIsXG5cbiAgdGVtcGxhdGU6IHRlbXBsYXRlLFxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJyZXF1ZXN0XCIsIHRoaXMucmVuZGVyTG9hZGluZyk7XG4gICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcInN5bmNcIiwgdGhpcy5yZW5kZXIpO1xuICB9LFxuXG4gIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRhdGEgPSB0aGlzLm1vZGVsLnRvSlNPTigpO1xuICAgIGRhdGEuY29sb3JpZCA9IHRoaXMubW9kZWwuZ2V0Q29sb3JJZCgpO1xuICAgIHRoaXMucmVuZGVyVGVtcGxhdGUoZGF0YSk7XG4gIH1cblxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBDYXJkRGV0YWlsc1ZpZXc7IiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnMgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnMudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlciwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlcjtcbiAgYnVmZmVyICs9IFwiXFxuPGZpZ3VyZSBjbGFzcz1cXFwiY29sb3JpZC1cIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMuY29sb3JpZCkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5jb2xvcmlkKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLmZpZ3VyZUJhY2tncm91bmRDb2xvciksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJjb250YWluZXJcXFwiPlxcbiAgICA8aW1nIHNyYz1cXFwiXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLmZpZ3VyZSkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5maWd1cmUpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiBhbHQ9XFxcIkthdHRcXFwiLz5cXG4gIDwvZGl2PlxcbjwvZmlndXJlPlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgaGVscGVyO1xuICBidWZmZXIgKz0gXCJzdHlsZT1cXFwiYmFja2dyb3VuZC1jb2xvcjpcIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMuZmlndXJlQmFja2dyb3VuZENvbG9yKSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLmZpZ3VyZUJhY2tncm91bmRDb2xvcik7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgPHNlY3Rpb24+XFxuICAgIDxoMj5SZWZlcmFuc2VyIG9nIHJlc3N1cnNlcjwvaDI+XFxuICAgIDx1bD5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5yZWZlcmVuY2UpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNSwgcHJvZ3JhbTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgIDwvdWw+XFxuICA8L3NlY3Rpb24+XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlcjtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8bGk+XFxuICAgICAgICAgIDxhIGhyZWY9XFxcIlwiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy51cmwpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAudXJsKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XFxuICAgICAgICAgICAgXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLnRpdGxlKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcbiAgICAgICAgICA8L2E+XFxuICAgICAgICA8L2xpPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW03KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gIDxzZWN0aW9uPlxcbiAgICA8aDI+XFxuICAgICAgUmVsZXZhbnRlIG9nIGJlc2xla3RlZGUgdGVtYWVyXFxuICAgIDwvaDI+XFxuXFxuICAgIDx1bD5cXG4gICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAucmVsZXZhbnQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oOCwgcHJvZ3JhbTgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgIDwvdWw+XFxuXFxuICA8L3NlY3Rpb24+XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTgoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlcjtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPGxpPlxcbiAgICAgICAgPGEgaHJlZj1cXFwiXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLnVybCkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC51cmwpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cXG4gICAgICAgICAgXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLnRpdGxlKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcbiAgICAgICAgPC9hPlxcbiAgICAgIDwvbGk+XFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGhlYWRlcj5cXG4gIDxkaXYgY2xhc3M9XFxcImNvbnRhaW5lclxcXCI+XFxuICAgIDxoMSBjbGFzcz1cXFwiZGVjb3JhdGVkXFxcIj5cIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAudGl0bGUpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9oMT5cXG4gICAgPHAgY2xhc3M9XFxcImxlYWRcXFwiPlwiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5wcmVmYWNlKSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLnByZWZhY2UpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9wPlxcbiAgPC9kaXY+XFxuPC9oZWFkZXI+XFxuXFxuXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIChkZXB0aDAgJiYgZGVwdGgwLmZpZ3VyZSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG48ZGl2IGNsYXNzPVxcXCJhcnRpY2xlLWJvZHlcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY29udGFpbmVyXFxcIj5cXG4gICAgXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLmJvZHkpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAuYm9keSk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXFxuPGFzaWRlPlxcbiAgPGRpdiBjbGFzcz1cXFwiY29udGFpbmVyXFxcIj5cXG4gIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5yZWZlcmVuY2UpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNCwgcHJvZ3JhbTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAucmVsZXZhbnQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNywgcHJvZ3JhbTcsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICA8L2Rpdj5cXG48L2FzaWRlPlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KTtcbiIsInZhciBCYXNlVmlldyA9IHJlcXVpcmUoXCIuLi9iYXNlL3ZpZXdcIik7XG52YXIgdGVtcGxhdGUgPSByZXF1aXJlKFwiLi90ZW1wbGF0ZS5oYlwiKTtcblxudmFyIENhcmRMaXN0VmlldyA9IEJhc2VWaWV3LmV4dGVuZCh7XG5cbiAgdGVtcGxhdGU6IHRlbXBsYXRlLFxuXG4gIGNsYXNzTmFtZTogXCJjYXJkLWxpc3Qtd3JhcHBlclwiLFxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2xsZWN0aW9uLCBcInJlcXVlc3RcIiwgdGhpcy5yZW5kZXJMb2FkaW5nKTtcbiAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sbGVjdGlvbiwgXCJzeW5jXCIsIHRoaXMucmVuZGVyKTtcbiAgfSxcblxuICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZGF0YSA9IHRoaXMuY29sbGVjdGlvbi5tYXAoZnVuY3Rpb24obW9kZWwpIHtcbiAgICAgIHZhciBhdHRycyA9IG1vZGVsLnRvSlNPTigpO1xuICAgICAgYXR0cnMuY29sb3JpZCA9IG1vZGVsLmdldENvbG9ySWQoKTtcblxuICAgICAgcmV0dXJuIGF0dHJzO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZW5kZXJUZW1wbGF0ZShkYXRhKTtcbiAgfSxcblxuICByZW5kZXJMb2FkaW5nOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmVsLmlubmVySFRNTCA9IFwiTGFzdGVyIHNwZW5uZW5kZSB0aW5nLi4uXCI7XG4gIH1cblxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBDYXJkTGlzdFZpZXc7IiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnMgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnMudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBoZWxwZXI7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGxpPjxhIGhyZWY9XFxcIiNrb3J0L1wiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5rZXkpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAua2V5KTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgY2xhc3M9XFxcImJ1bGIgY29sb3JpZC1cIjtcbiAgaWYgKGhlbHBlciA9IGhlbHBlcnMuY29sb3JpZCkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5jb2xvcmlkKTsgc3RhY2sxID0gdHlwZW9mIGhlbHBlciA9PT0gZnVuY3Rpb25UeXBlID8gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KSA6IGhlbHBlcjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XFxuICAgICAgICAgICAgPHNwYW4+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoZGVwdGgwICYmIGRlcHRoMC50aXRsZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9zcGFuPlxcbiAgICAgICAgPC9hPjwvbGk+XFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPG5hdiBjbGFzcz1cXFwibmF2aWdhdGlvblxcXCIgcm9sZT1cXFwibmF2aWdhdGlvblxcXCI+XFxuPHVsIGNsYXNzPVxcXCJjYXJkLWxpc3QgZ3JpZC12aWV3IGNvbnRhaW5lclxcXCI+XFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbjwvdWw+XFxuPC9uYXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pO1xuIiwidmFyIEV4b3NrZWxldG9uID0gcmVxdWlyZShcImV4b3NrZWxldG9uXCIpO1xudmFyIE5hdmlnYXRpb25WaWV3ID0gcmVxdWlyZShcIi4uL25hdmlnYXRpb24vbmF2aWdhdGlvbi52aWV3XCIpO1xudmFyIEV4cGxvcmF0b3J5TGlzdFZpZXcgPSByZXF1aXJlKFwiLi4vZXhwbG9yYXRvcnlMaXN0L2V4cGxvcmF0b3J5TGlzdC52aWV3XCIpO1xudmFyIENhcmRMaXN0VmlldyA9IHJlcXVpcmUoXCIuLi9jYXJkTGlzdC9jYXJkTGlzdC52aWV3XCIpO1xudmFyIENhcmREZXRhaWxzVmlldyA9IHJlcXVpcmUoXCIuLi9jYXJkRGV0YWlscy9jYXJkRGV0YWlscy52aWV3XCIpO1xudmFyIENhcmRDb2xsZWN0aW9uID0gcmVxdWlyZShcIi4uL2NhcmQvY2FyZHNcIik7XG52YXIgQ2FyZE1vZGVsID0gcmVxdWlyZShcIi4uL2NhcmQvY2FyZFwiKTtcblxudmFyIGNhcmRDb2xsZWN0aW9uID0gbmV3IENhcmRDb2xsZWN0aW9uKCk7XG5cbnZhciBjdXJyZW50RWxlbWVudDtcbnZhciBjaGFuZ2VQYWdlID0gZnVuY3Rpb24odmlldykge1xuICBpZihjdXJyZW50RWxlbWVudCAmJiBjdXJyZW50RWxlbWVudC5yZW1vdmUpIHtcbiAgICBjdXJyZW50RWxlbWVudC5yZW1vdmUoKTtcbiAgfVxuXG4gIGN1cnJlbnRFbGVtZW50ID0gdmlldztcblxuICB2YXIgbWFpbkVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIm1haW5cIik7XG4gIHdoaWxlIChtYWluRWwuZmlyc3RDaGlsZCkge1xuICAgIG1haW5FbC5yZW1vdmVDaGlsZChtYWluRWwuZmlyc3RDaGlsZCk7XG4gIH1cblxuICBtYWluRWwuYXBwZW5kQ2hpbGQoY3VycmVudEVsZW1lbnQuZWwpO1xufTtcblxuXG52YXIgUm91dGVyID0gRXhvc2tlbGV0b24uUm91dGVyLmV4dGVuZCh7XG5cbiAgcm91dGVzOiB7XG4gICAgXCJcIjogICAgICAgICAgICAgICBcImxpc3RDYXJkc1wiLFxuICAgIFwibGlzdGVcIjogICAgICAgICAgXCJsaXN0Q2FyZHNcIixcbiAgICBcImV4cGxvcmF0b3J5XCI6ICAgIFwiZXhwbG9yYXRvcnlcIixcbiAgICBcImtvcnQvOmtleVwiOiAgICAgIFwiY2FyZERldGFpbHNcIlxuICB9LFxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB0aGlzLm5hdmlnYXRpb25WaWV3ID0gbmV3IE5hdmlnYXRpb25WaWV3KHtcbiAgICAgIGVsOiBcIm5hdlwiXG4gICAgfSk7XG5cbiAgICB0aGlzLm9uKFwicm91dGVcIiwgdGhpcy5uYXZpZ2F0aW9uVmlldy5yZW5kZXIsIHRoaXMubmF2aWdhdGlvblZpZXcpO1xuICB9LFxuXG4gIGV4cGxvcmF0b3J5OiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZXhwbG9yYXRvcnlWaWV3ID0gbmV3IEV4cGxvcmF0b3J5TGlzdFZpZXcoe1xuICAgICAgY29sbGVjdGlvbjogY2FyZENvbGxlY3Rpb25cbiAgICB9KTtcblxuICAgIGNoYW5nZVBhZ2UuY2FsbCh0aGlzLCBleHBsb3JhdG9yeVZpZXcpO1xuICAgIGNhcmRDb2xsZWN0aW9uLmZldGNoKCk7XG4gIH0sXG5cbiAgbGlzdENhcmRzOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgY2FyZExpc3RWaWV3ID0gbmV3IENhcmRMaXN0Vmlldyh7XG4gICAgICBjb2xsZWN0aW9uOiBjYXJkQ29sbGVjdGlvblxuICAgIH0pO1xuXG4gICAgY2hhbmdlUGFnZS5jYWxsKHRoaXMsIGNhcmRMaXN0Vmlldyk7XG4gICAgY2FyZExpc3RWaWV3LnJlbmRlcigpO1xuXG4gICAgY2FyZENvbGxlY3Rpb24uZmV0Y2goKTtcbiAgfSxcblxuICBjYXJkRGV0YWlsczogZnVuY3Rpb24oa2V5KSB7XG4gICAgdmFyIGNhcmRNb2RlbCA9IGNhcmRDb2xsZWN0aW9uLmdldChrZXkpIHx8IGNhcmRDb2xsZWN0aW9uLmFkZCh7a2V5OmtleX0pO1xuXG4gICAgdmFyIGNhcmREZXRhaWxzVmlldyA9IG5ldyBDYXJkRGV0YWlsc1ZpZXcoe1xuICAgICAgbW9kZWw6IGNhcmRNb2RlbFxuICAgIH0pO1xuICAgIGNhcmRNb2RlbC5mZXRjaCgpO1xuXG4gICAgY2hhbmdlUGFnZS5jYWxsKHRoaXMsIGNhcmREZXRhaWxzVmlldyk7XG4gIH0sXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBSb3V0ZXI7IiwiLy8gZnJvbSBodHRwczovL3JlbXlzaGFycC5jb20vMjAxMC8wNy8yMS90aHJvdHRsaW5nLWZ1bmN0aW9uLWNhbGxzXG52YXIgX25vdyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG59O1xuXG5leHBvcnRzLnRocm90dGxlID0gZnVuY3Rpb24gdGhyb3R0bGUoZm4sIHRocmVzaCwgc2NvcGUpIHtcbiAgdmFyIHRocmVzaGhvbGQgPSB0aHJlc2ggfHwgMjUwO1xuICB2YXIgbGFzdCwgZGVmZXJUaW1lcjtcblxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjb250ZXh0ID0gc2NvcGUgfHwgdGhpcztcblxuICAgIHZhciBub3cgPSBfbm93KCksXG4gICAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgaWYgKGxhc3QgJiYgbm93IDwgbGFzdCArIHRocmVzaGhvbGQpIHtcbiAgICAgIC8vIGhvbGQgb24gdG8gaXRcbiAgICAgIGNsZWFyVGltZW91dChkZWZlclRpbWVyKTtcbiAgICAgIGRlZmVyVGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGFzdCA9IG5vdztcbiAgICAgICAgZm4uYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICB9LCB0aHJlc2hob2xkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGFzdCA9IG5vdztcbiAgICAgIGZuLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgIH1cbiAgfTtcbn07IiwidmFyIEJhc2VWaWV3ID0gcmVxdWlyZShcIi4uL2Jhc2Uvdmlld1wiKTtcbnZhciB0ZW1wbGF0ZSA9IHJlcXVpcmUoXCIuL3RlbXBsYXRlLmhiXCIpO1xudmFyIHBsYWNlbWVudCA9IHJlcXVpcmUoXCIuL3BsYWNlbWVudFwiKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoXCIuLi9jb21tb24vdXRpbHNcIik7XG5cbnZhciBDYXJkTGlzdFZpZXcgPSBCYXNlVmlldy5leHRlbmQoe1xuXG4gIHRlbXBsYXRlOiB0ZW1wbGF0ZSxcblxuICBjbGFzc05hbWU6IFwiZXhwbG9yYXRvcnktbGlzdFwiLFxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2xsZWN0aW9uLCBcInJlcXVlc3RcIiwgdGhpcy5yZW5kZXJMb2FkaW5nKTtcbiAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sbGVjdGlvbiwgXCJzeW5jXCIsIHRoaXMucmVuZGVyKTtcblxuICAgIHRoaXMuY29sbGVjdGlvbi5jb21wYXJhdG9yID0gXCJpbXBvcnRhbmNlXCI7XG4gICAgdGhpcy5jb2xsZWN0aW9uLnNvcnQoKTtcblxuICAgIHdpbmRvdy5vbnNjcm9sbCA9IHV0aWxzLnRocm90dGxlKHRoaXMub25XaW5kb3dTY3JvbGwsIDEwMCwgdGhpcyk7XG4gIH0sXG5cbiAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2l6ZSA9IHRoaXMuZ2V0RWxlbWVudFNpemUoKTtcbiAgICB2YXIgcGhhc2UgPSB0aGlzLmdldEN1cnJlbnRQaGFzZSgpO1xuXG4gICAgdmFyIGRhdGEgPSB0aGlzLmNvbGxlY3Rpb24ubWFwKGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgICB2YXIgYXR0cnMgPSBtb2RlbC50b0pTT04oKTtcbiAgICAgIGF0dHJzLmltcG9ydGFuY2UgPSBtb2RlbC5nZXRJbXBvcnRhbmNlKHBoYXNlKTtcbiAgICAgIGF0dHJzLmNvbG9yaWQgPSBtb2RlbC5nZXRDb2xvcklkKCk7XG4gICAgICBhdHRycy5jaWQgPSBtb2RlbC5jaWQ7XG5cbiAgICAgIHJldHVybiBhdHRycztcbiAgICB9KTtcblxuICAgIHRoaXMucmVuZGVyVGVtcGxhdGUoZGF0YSk7XG5cbiAgICBwbGFjZW1lbnQoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5pdGVtIGFcIiksIHRoaXMuZ2V0RWxlbWVudFNpemUoKSk7XG5cbiAgICB0aGlzLl9jdXJyZW50UGhhc2UgPSBwaGFzZTtcbiAgfSxcblxuICByZW5kZXJMb2FkaW5nOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmVsLmlubmVySFRNTCA9IFwiTGFzdGVyIHNwZW5uZW5kZSB0aW5nLi4uXCI7XG4gIH0sXG5cbiAgZ2V0RWxlbWVudFNpemU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYm9keUJvdW5kaW5nUmVjdCA9IGRvY3VtZW50LmJvZHkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgdmFyIGJvdW5kaW5nUmVjdCA9IHRoaXMuZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICB2YXIgbWluV2lkdGggID0gYm91bmRpbmdSZWN0LmxlZnQgKyBkb2N1bWVudC5ib2R5LnNjcm9sbExlZnQ7XG4gICAgdmFyIG1pbkhlaWdodCA9IGJvdW5kaW5nUmVjdC50b3AgKyBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcDtcblxuICAgIHJldHVybiB7XG4gICAgICBtaW5XaWR0aCAgOiBtaW5XaWR0aCxcbiAgICAgIG1pbkhlaWdodCA6IG1pbkhlaWdodCxcbiAgICAgIHdpZHRoICAgICA6IGJvZHlCb3VuZGluZ1JlY3Qud2lkdGggLSBtaW5XaWR0aCxcbiAgICAgIGhlaWdodCAgICA6IGJvZHlCb3VuZGluZ1JlY3QuaGVpZ2h0IC0gbWluSGVpZ2h0XG4gICAgfTtcbiAgfSxcblxuICBvbldpbmRvd1Njcm9sbDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBoYXNlID0gdGhpcy5nZXRDdXJyZW50UGhhc2UoKTtcbiAgICB0aGlzLnJlZXZhbHVhdGVJbXBvcnRhbmNlKHBoYXNlKTtcbiAgfSxcblxuICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgIHdpbmRvdy5vbnNjcm9sbCA9IG51bGw7XG4gICAgQmFzZVZpZXcucHJvdG90eXBlLnJlbW92ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9LFxuXG4gIHJlZXZhbHVhdGVJbXBvcnRhbmNlOiBmdW5jdGlvbihwaGFzZSkge1xuICAgIGlmKHBoYXNlID09PSB0aGlzLl9jdXJyZW50UGhhc2UpIHJldHVybjtcblxuICAgIHZhciBlbGVtZW50cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuaXRlbSBhXCIpO1xuXG4gICAgW10uZm9yRWFjaC5jYWxsKGVsZW1lbnRzLCBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgICB2YXIgY2lkID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWNpZFwiKTtcbiAgICAgIHZhciBtb2RlbCA9IHRoaXMuY29sbGVjdGlvbi5nZXQoY2lkKTtcblxuICAgICAgaWYobW9kZWwpIHtcbiAgICAgICAgdmFyIGltcG9ydGFuY2UgPSBtb2RlbC5nZXRJbXBvcnRhbmNlKHBoYXNlKTtcbiAgICAgICAgZWxlbWVudC5jbGFzc05hbWUgPSBlbGVtZW50LmNsYXNzTmFtZS5yZXBsYWNlKC9pbXBvcnRhbmNlLVtcXGRdKy8sIFwiaW1wb3J0YW5jZS1cIiArIGltcG9ydGFuY2UpO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbGVtZW50LnJlbW92ZSgpO1xuICAgICAgfVxuXG4gICAgfSwgdGhpcyk7XG4gICAgcGxhY2VtZW50KGVsZW1lbnRzLCB0aGlzLmdldEVsZW1lbnRTaXplKCkpO1xuXG4gICAgdGhpcy5fY3VycmVudFBoYXNlID0gcGhhc2U7XG4gIH0sXG5cbiAgZ2V0Q3VycmVudFBoYXNlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2Nyb2xsVG9wID0gZG9jdW1lbnQuYm9keS5zY3JvbGxUb3A7XG4gICAgdmFyIHNlY3Rpb25IZWlnaHQgPSB0aGlzLmVsLm9mZnNldEhlaWdodCAvIDY7XG5cbiAgICByZXR1cm4gTWF0aC5mbG9vcihzY3JvbGxUb3AgLyBzZWN0aW9uSGVpZ2h0KTtcbiAgfVxuXG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IENhcmRMaXN0VmlldzsiLCIvLyBmcmEgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy82MjI0NTcxL3Bvc2l0aW9uaW5nLW11bHRpcGxlLXJhbmRvbS1zaXplZC1hYnNvbHV0ZWx5LXBvc2l0aW9uZWQtZWxlbWVudHMtc28tdGhleS1kb250XG5cbnZhciBnZXRTaXplID0gZnVuY3Rpb24oZWxlbWVudCkge1xuICAgIHZhciBjbG9uZSA9IGVsZW1lbnQuY2xvbmVOb2RlKCk7XG4gICAgZWxlbWVudC5wYXJlbnROb2RlLmFwcGVuZENoaWxkKGNsb25lKTtcblxuICAgIHZhciByZXR1cm5PYmogPSB7XG4gICAgICAgIHdpZHRoOiAgY2xvbmUub2Zmc2V0V2lkdGgsXG4gICAgICAgIGhlaWdodDogY2xvbmUub2Zmc2V0SGVpZ2h0XG4gICAgfTtcbiAgICBjbG9uZS5yZW1vdmUoKTtcblxuICAgIHJldHVybiByZXR1cm5PYmo7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZWxlbWVudHMsIG9wdGlvbnMpIHtcblxuICAgIHZhciBtaW5YID0gb3B0aW9ucy5taW5XaWR0aCB8fCAwO1xuICAgIHZhciBtYXhYID0gb3B0aW9ucy53aWR0aDtcbiAgICB2YXIgbWluWSA9IG9wdGlvbnMubWluSGVpZ2h0IHx8IDA7XG4gICAgdmFyIG1heFkgPSBvcHRpb25zLmhlaWdodDtcbiAgICB2YXIgZmlsbGVkQXJlYXMgPSBbXTtcblxuICAgIFtdLmZvckVhY2guY2FsbChlbGVtZW50cywgZnVuY3Rpb24oZWxlbWVudCkge1xuICAgICAgICB2YXIgYXJlYTtcbiAgICAgICAgdmFyIHNpemUgPSBnZXRTaXplKGVsZW1lbnQpO1xuXG4gICAgICAgIHZhciByYW5kWCA9IDA7XG4gICAgICAgIHZhciByYW5kWSA9IDA7XG5cbiAgICAgICAgdmFyIHdpZHRoICA9IHNpemUud2lkdGg7XG4gICAgICAgIHZhciBoZWlnaHQgPSBzaXplLmhlaWdodDtcblxuICAgICAgICB2YXIgc3VidHJhY3RlZE1heFggPSBtYXhYIC0gd2lkdGg7XG4gICAgICAgIHZhciBzdWJ0cmFjdGVkTWF4WSA9IG1heFkgLSBoZWlnaHQ7XG4gICAgICAgIHZhciBsb29wQ291bnRlciA9IDA7XG5cbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgbG9vcENvdW50ZXIrKztcbiAgICAgICAgICAgIHJhbmRYID0gTWF0aC5yb3VuZChtaW5YICsgKChzdWJ0cmFjdGVkTWF4WCAtIG1pblgpKihNYXRoLnJhbmRvbSgpICUgMSkpKTtcbiAgICAgICAgICAgIHJhbmRZID0gTWF0aC5yb3VuZChtaW5ZICsgKChzdWJ0cmFjdGVkTWF4WSAtIG1pblkpKihNYXRoLnJhbmRvbSgpICUgMSkpKTtcbiAgICAgICAgICAgIGFyZWEgPSB7eDogcmFuZFgsIHk6IHJhbmRZLCB3aWR0aDogd2lkdGgsIGhlaWdodDogaGVpZ2h0fTtcbiAgICAgICAgfSB3aGlsZShjaGVja092ZXJsYXAoYXJlYSkgJiYgbG9vcENvdW50ZXIgPCA1MDAwKTtcblxuICAgICAgICBpZiAobG9vcENvdW50ZXIgPT0gNTAwMCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJsb29wQ291bnRlciBhdmJyw7h0IHBsYXNzZXJpbmdcIik7XG4gICAgICAgIH1cblxuICAgICAgICBmaWxsZWRBcmVhcy5wdXNoKGFyZWEpO1xuXG4gICAgICAgIGVsZW1lbnQuc3R5bGUubGVmdCA9IHJhbmRYICsgXCJweFwiO1xuICAgICAgICBlbGVtZW50LnN0eWxlLnRvcCAgPSByYW5kWSArIFwicHhcIjtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGNoZWNrT3ZlcmxhcChhcmVhKSB7XG4gICAgICAgIHZhciBmaWxsZWRBcmVhc0xlbmd0aCA9ICBmaWxsZWRBcmVhcy5sZW5ndGg7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmlsbGVkQXJlYXNMZW5ndGg7IGkrKykge1xuXG4gICAgICAgICAgICBjaGVja0FyZWEgPSBmaWxsZWRBcmVhc1tpXTtcblxuICAgICAgICAgICAgdmFyIGJvdHRvbTEgPSBhcmVhLnkgKyBhcmVhLmhlaWdodDtcbiAgICAgICAgICAgIHZhciBib3R0b20yID0gY2hlY2tBcmVhLnkgKyBjaGVja0FyZWEuaGVpZ2h0O1xuICAgICAgICAgICAgdmFyIHRvcDEgICAgPSBhcmVhLnk7XG4gICAgICAgICAgICB2YXIgdG9wMiAgICA9IGNoZWNrQXJlYS55O1xuICAgICAgICAgICAgdmFyIGxlZnQxICAgPSBhcmVhLng7XG4gICAgICAgICAgICB2YXIgbGVmdDIgICA9IGNoZWNrQXJlYS54O1xuICAgICAgICAgICAgdmFyIHJpZ2h0MSAgPSBhcmVhLnggKyBhcmVhLndpZHRoO1xuICAgICAgICAgICAgdmFyIHJpZ2h0MiAgPSBjaGVja0FyZWEueCArIGNoZWNrQXJlYS53aWR0aDtcblxuICAgICAgICAgICAgaWYgKGJvdHRvbTEgPCB0b3AyIHx8IHRvcDEgPiBib3R0b20yIHx8IHJpZ2h0MSA8IGxlZnQyIHx8IGxlZnQxID4gcmlnaHQyKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTsiLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFycyA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFycy50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGhlbHBlcjtcbiAgYnVmZmVyICs9IFwiXFxuICAgIDxkaXYgY2xhc3M9XFxcIml0ZW1cXFwiPlxcbiAgICAgICAgPGEgaHJlZj1cXFwiI2tvcnQvXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLmtleSkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5rZXkpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiBkYXRhLWNpZD1cXFwiXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLmNpZCkgeyBzdGFjazEgPSBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBoZWxwZXIgPSAoZGVwdGgwICYmIGRlcHRoMC5jaWQpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiBjbGFzcz1cXFwiYnVsYiBpbXBvcnRhbmNlLVwiO1xuICBpZiAoaGVscGVyID0gaGVscGVycy5pbXBvcnRhbmNlKSB7IHN0YWNrMSA9IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IGhlbHBlciA9IChkZXB0aDAgJiYgZGVwdGgwLmltcG9ydGFuY2UpOyBzdGFjazEgPSB0eXBlb2YgaGVscGVyID09PSBmdW5jdGlvblR5cGUgPyBoZWxwZXIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pIDogaGVscGVyOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiIGNvbG9yaWQtXCI7XG4gIGlmIChoZWxwZXIgPSBoZWxwZXJzLmNvbG9yaWQpIHsgc3RhY2sxID0gaGVscGVyLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgaGVscGVyID0gKGRlcHRoMCAmJiBkZXB0aDAuY29sb3JpZCk7IHN0YWNrMSA9IHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSkgOiBoZWxwZXI7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlxcbiAgICAgICAgICAgIDxzcGFuPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKGRlcHRoMCAmJiBkZXB0aDAudGl0bGUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvc3Bhbj5cXG4gICAgICAgIDwvYT5cXG4gICAgPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyByZXR1cm4gc3RhY2sxOyB9XG4gIGVsc2UgeyByZXR1cm4gJyc7IH1cbiAgfSk7XG4iLCJ2YXIgRXhvc2tlbGV0b24gPSByZXF1aXJlKFwiZXhvc2tlbGV0b25cIik7XG52YXIgUm91dGVyID0gcmVxdWlyZShcIi4vY29tbW9uL3JvdXRlclwiKTtcblxudmFyIHJvdXRlciA9IG5ldyBSb3V0ZXIoKTtcblxuRXhvc2tlbGV0b24uaGlzdG9yeS5zdGFydCgpOyIsInZhciBCYXNlVmlldyA9IHJlcXVpcmUoXCIuLi9iYXNlL3ZpZXdcIik7XG52YXIgdGVtcGxhdGUgPSByZXF1aXJlKFwiLi90ZW1wbGF0ZS5oYlwiKTtcblxudmFyIE5hdmlnYXRpb25WaWV3ID0gQmFzZVZpZXcuZXh0ZW5kKHtcblxuICB0ZW1wbGF0ZTogdGVtcGxhdGUsXG5cbiAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgaGFzaCA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cigxKTtcblxuICAgIHRoaXMucmVuZGVyVGVtcGxhdGUoe1xuICAgICAgICBpc0xpc3RlICAgICAgICAgOiBoYXNoID09PSBcIlwiIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGhhc2ggPT09IFwibGlzdGVcIixcbiAgICAgICAgaXNFeHBsb3JhdG9yeSAgIDogaGFzaCA9PT0gXCJleHBsb3JhdG9yeVwiLFxuICAgICAgICBzaG93QmFja0J1dHRvbiAgOiBoYXNoICE9PSBcIlwiICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGhhc2ggIT09IFwibGlzdGVcIiAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNoICE9PSBcImV4cGxvcmF0b3J5XCJcbiAgICB9KTtcbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBOYXZpZ2F0aW9uVmlldzsiLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFycyA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFycy50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIlxcbiAgICA8YSBocmVmPVxcXCIvXFxcIiBjbGFzcz1cXFwiY2xvc2VidG5cXFwiPlxcbiAgICAgICAgPHNwYW4gY2xhc3M9XFxcInZpc3VhbGx5aGlkZGVuXFxcIj5UaWxiYWtlIHRpbCBmb3JzaWRlPC9zcGFuPlxcbiAgICA8L2E+XFxuXFxuXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJ0b2dnbGUtbmF2LW1vZGVcXFwiPlxcblxcbiAgICAgICAgPGEgaHJlZj1cXFwiI2V4cGxvcmF0b3J5XFxcIiBjbGFzcz1cXFwibmF2LW1vZGUgaWNvbi1idWJibGVcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKGRlcHRoMCAmJiBkZXB0aDAuaXNFeHBsb3JhdG9yeSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0LCBwcm9ncmFtNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJ2aXN1YWxseWhpZGRlblxcXCI+VXRmb3Jza2VuZGUgbmF2aWdlcmluZ3Ntb2R1czwvc3Bhbj5cXG4gICAgICAgIDwvYT5cXG5cXG4gICAgICAgIDxhIGhyZWY9XFxcIiNsaXN0ZVxcXCIgY2xhc3M9XFxcIm5hdi1tb2RlIGljb24tZ3JpZFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5pc0xpc3RlKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDQsIHByb2dyYW00LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcInZpc3VhbGx5aGlkZGVuXFxcIj5NZW55IGkgYWxmYWJldGlzayBzb3J0ZXJ0IHJla2tlZsO4bGdlPC9zcGFuPlxcbiAgICAgICAgPC9hPlxcblxcbiAgICA8L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgY2hlY2tlZFwiO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGRpdiBjbGFzcz1cXFwiY29udGFpbmVyIGxvZ28tY29udGFpbmVyXFxcIj5cXG5cXG4gICAgPGltZyBzcmM9XFxcImltYWdlcy91dS1sb2dvLnBuZ1xcXCIgYWx0PVxcXCJsb2dvXFxcIi8+XFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoZGVwdGgwICYmIGRlcHRoMC5zaG93QmFja0J1dHRvbiksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuPC9kaXY+XFxuXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pO1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZXhvc2tlbGV0b25cIik7XG4iXX0=
