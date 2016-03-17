/**
 * helpers for writing code used in any context
 */
"use strict";

exports.isRenderer = function() {
  return process.type === "renderer";
}

exports.nodeProcess = function() {
  return exports.isRenderer() ? window.require("remote").require("process")
                              : process;
}

// can't abstract - as need require() calls to do browserify builds. will always need a isRender() ? requireMain : require();
exports.requireMain = function() {
  if(!exports.isRenderer()) {
    throw Error("requireMain() called outside of renderer!");
  }
  return window.require("remote").require;
}
