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