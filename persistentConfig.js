/**
 * set/get persistent config
 */
"use strict";

const universal = require("./universal");
const osLib = require("./os");

const fs = universal.isRenderer() ? universal.requireMain("fs-extra") : require("fs-extra");

exports.set = function(key, value) {
  const json = JSON.stringify(value);
  fs.mkdirsSync(osLib.userDataPath());
  fs.writeFileSync(osLib.userDataPath() + "/" + key, json);
};


exports.get = function(key) {
  try {
    const v = fs.readFileSync(osLib.userDataPath() + "/" + key, {
      encoding: "utf8",
    });

    if(v) {
      return JSON.parse(v);
    }
  } catch(e) {
    if(/ENOENT/.test(e.message)) {
      return;
    } else {
      throw e;
    }
  }
};

