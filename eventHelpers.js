"use strict";

var _ = require("lodash");

exports.proxy = function proxy(proxy, target, originalName, newName) {
  newName = newName || originalName;

  target.on(originalName, proxied);

  return function off() {
    target.removeListener(originalName, proxied); 
  }

  function proxied() {
    proxy.emit.apply(proxy, [newName].concat([].slice.call(arguments)).concat(proxy));
  }
}

/*::

// null if target is same name as source
type targetEvent = string | null;

// removes all proxying
type cleanupFunction = () => null;

*/

exports.proxyMany = function proxyMany(source/*: EventEmitter */, target/*: EventEmitter */, mapping /*: { [id:sourceEvent]: targetEvent } */) /*: cleanupFunction */ {

  var deproxied = false;

  if(!source || !target) {
    throw new Error("requires two event emitters");
  }

  mapping = _.clone(mapping);

  var cleanup = _.map(mapping, function(newEvent, original) {
    return exports.proxy(source, target, original, newEvent);
  });

  return function() {
    _.each(cleanup, _.attempt);
    mapping = null;
    cleanup = null;
  };
}

exports.proxyAll = function proxyAll(source/*: EventEmitter */, target/*: EventEmitter */, prefix/*: null|string */) /*: cleanupFunction */ {

  var deproxied = false;

  if(!source || !target) {
    throw new Error("requires two event emitters");
  }

  var originalEmit = source.emit;
  source.emit = function(name) {
    originalEmit.apply(source, arguments);
    target.emit(prepareName(name), _.tail(arguments));
  };

  return function() {
    source.emit = originalEmit;
    originalEmit = null;
    source = null;
    target = null;
  };

  function prepareName(name) {
    return prefix == null ? name : prefix + name[0].toUpperCase() + name.slice(1);
  }
}
