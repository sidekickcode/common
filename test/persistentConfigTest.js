"use strict";

var osLib = require("../os");
var config = require("../persistentConfig");
var fs = require("fs-extra");

describe('persistentConfig', function() {

  it('can write', function() {
    config.set("a", [1,2,3]);
  })

  it('can read what it writes', function() {
    config.set("a", [1,2,3]);
    assert.deepEqual(config.get("a"), [1,2,3]);
  })

  it('gets undefined before written', function() {
    assert.isUndefined(config.get("b"));
  })

  it('informs if garbage data is present', function() {
    fs.mkdirsSync(osLib.userDataPath());
    fs.writeFileSync(osLib.userDataPath() + "/c", "not JSON");

    assert.throws(function() {
      config.get("c");
    });
  });
    
})
