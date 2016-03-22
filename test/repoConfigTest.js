"use strict";
var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

var path = require("path");

var repoConfig = require('../repoConfig');

describe('repoConfig', function() {

  describe('positive tests', function() {
    it('loads a valid config and parses the contents', function(done) {
      var pathToTestRepo = path.join(__dirname, '/fixtures/testRepo');
      repoConfig.load(pathToTestRepo)
        .then(function(contents){
          expect(contents.exclude.length).to.equal(9);
	  expect(contents.languages.js).to.be.an('object');
	  expect(contents.languages.cs).to.be.an('object');
          done();
        }, function(err){
          expect.fail();
          done();
        })
    });

    it('gets a list of all analysers', function(done) {
      var pathToTestRepo = path.join(__dirname, '/fixtures/testRepo');
      repoConfig.load(pathToTestRepo)
          .then(function(contents){
            var allAnalysers = repoConfig.getAllAnalysers(contents);
            expect(allAnalysers.length).to.equal(3);
            done();
          }, function(err){
            expect.fail();
            done();
          })
    });

  });

  describe('negative tests', function() {
  });
});
