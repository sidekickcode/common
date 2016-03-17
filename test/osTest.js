"use strict";
var path = require("path");
var osLib = require("../os");

describe('os', function() {

  describe('userDataPath', function() {
    it('contains sidekick to differentate from other apps', function() {
      assert.match(osLib.userDataPath(), /sidekick/i);
    })

    it('is absolute path', function() {
      assert.isTrue(path.isAbsolute(osLib.userDataPath()));
    })
  })

    
})
