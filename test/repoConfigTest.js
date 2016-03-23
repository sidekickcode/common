"use strict";
const path = require("path");

const repoConfig = require('../repoConfig');
const pathToTestRepo = path.join(__dirname, '/fixtures/testRepo');
const _ = require("lodash");

describe('RepoConfig', function() {

  it('works with empty input without throwing', function() {
    repoConfig.fromString("");
  })

  it('filters paths', function() {

    var paths = [
      "hn.arc",
      "darcs.hs",
      "stuff.lisp",
      "qp_xml.py",
      "iojs",
      "vendor/node/bin/node",
    ];

    var filtered = repoConfig.fromString("{}").includedPaths(paths, "py");

    assert.deepEqual(filtered, ["qp_xml.py"]);
  })

  it('does not include binaries', function() {

    var paths = [
      "vendor/node/bin/node",
      "bin/sk",
      "/bin/sk",
      "/vendor/node/bin/node",
    ];

    var filtered = repoConfig.fromString("{}").includedPaths(paths, "js");

    assert.deepEqual(filtered, []);
  })

  it('gives access to analysers', function() {

    const jshint = { name: "jshint" };
    var conf = repoConfig.fromString(JSON.stringify({
      languages: {
        js: {
          jshint: jshint,
        },
        py: {},
      }
    }));

    assert.deepEqual(conf.analysers("js"), [jshint]);
    assert.deepEqual(conf.analysers("py"), []);
  })

  describe('loaded from file', function() {
    var config;
    before(function() {
      return repoConfig.load(pathToTestRepo)
        .then(function(_config){
          config = _config;
        })
    })

    it('gives access to analysers', function() {
      assert.sameMembers(_.pluck(config.analysers("js"), "name"), ["sidekick-js-todos", "sidekick-jscs"]);
    })
      
  })

})
  
