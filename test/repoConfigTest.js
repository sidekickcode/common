"use strict";
const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

const path = require("path");

const repoConfig = require('../repoConfig');

describe('repoConfig', function() {

  describe('positive tests', function() {
    describe('loads a valid config', function() {

      var parsed;
      const pathToTestRepo = path.join(__dirname, '/fixtures/testRepo');
        
      before(function() {
        return repoConfig.load(pathToTestRepo)
          .then(function(contents){
            parsed = contents;
          })
      })

      it('loaded excludes', function() {
        expect(parsed.exclude.length).to.equal(9);
      });

      it('loaded all languages', function() {
        assert.sameMembers(Object.keys(parsed.languages), ["js", "cs"]);
        
      });

      it('formatted analysers with name', function() {
        assert.equal(parsed.languages.cs[0].name, "sidekick-coffeelint"); 
      })

      it('#getAllAnalysers', function() {
        var allAnalysers = repoConfig.getAllAnalysers(parsed);
        assert.lengthOf(allAnalysers, 3)
      });
    })


  });

  describe('negative tests', function() {
  });
});
