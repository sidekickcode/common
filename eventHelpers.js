"use strict";

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
