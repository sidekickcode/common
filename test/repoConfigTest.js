"use strict";
const path = require("path");
const fs = require('fs-extra');

const assert = require('chai').assert;

const repoConfig = require('../repoConfig');
const pathToTestRepo = path.join(__dirname, '/fixtures/testRepo');
const _ = require("lodash");

describe('RepoConfig', function() {

  it('works with empty input without throwing', function() {
    repoConfig.fromString("");
  });

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
  });

  it('does not include binaries', function() {

    var paths = [
      "vendor/node/bin/node",
      "bin/sk",
      "/bin/sk",
      "/vendor/node/bin/node",
    ];

    var filtered = repoConfig.fromString("{}").includedPaths(paths, "js");

    assert.deepEqual(filtered, []);
  });

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
  });

  it('throws error for invalid config - non-object analysers', function() {

    assert.throws(function(){repoConfig.fromString(JSON.stringify({
      "exclude": [],
      "languages": {
        "js": {
          "analysers": [
            "eslint"
          ]
        }
      }
    }))}, Error);
  });


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
      
  });

  describe('loads defaults', function() {
    var config;
    before(function() {
      return repoConfig.load(path.join(__dirname, '/fixtures/repoWithoutConfig'))
        .then(function(_config){
          config = _config;
        })
    });

    it('config has non-language specific defaults', function() {
      assert.sameMembers(_.keys(config.analysers("json")), ["sidekick-david"]);
      assert.sameMembers(_.keys(config.analysers("all")), ["sidekick-security"]);
      assert.lengthOf(config.analysers("js"), 0);
    })
  });

  describe('loads defaults - for javascript', function() {
    var config;
    var repoPath = path.join(__dirname, '/fixtures/repoWithoutConfig');
    before(function() {
      var testJS = fs.readFileSync(path.join(__dirname, '/repoConfigTest.js'));
      fs.writeFile(path.join(repoPath, '/test.js'), testJS);
      return repoConfig.load(path.join(__dirname, '/fixtures/repoWithoutConfig'))
          .then(function(_config){
            config = _config;
          })
    });

    it('config has javascript specific defaults', function() {
      assert.sameMembers(_.keys(config.analysers("json")), ["sidekick-david"]);
      assert.sameMembers(_.keys(config.analysers("all")), ["sidekick-security"]);
      assert.sameMembers(_.keys(config.analysers("js")), ["sidekick-eslint", "sidekick-js-todos", "sidekick-jshint"]);
    });

    after(function(){
      fs.removeSync(path.join(repoPath, '/test.js'));
    })
  })

});
  
