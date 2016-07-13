var chai = require('chai');
var expect = chai.expect;

var fs = require('fs-extra');
var path = require('path');
var _ = require('lodash');

const rc = require('../repoConfig.js');

describe('eslint config loader', function() {

  describe('positive tests', function () {

    var fixturesDir = path.join(__dirname, '/fixtures/eslintConfig');

    beforeEach(function(){
      fs.mkdirsSync(fixturesDir);
    });
    afterEach(function(){
      fs.removeSync(fixturesDir);
    });

    it('finds config file', function () {
      fs.writeFileSync(path.join(fixturesDir, '.eslintrc'), 'hello world', {encoding: 'utf-8'});
      expect(rc._eslintConfigExists(fixturesDir)).to.be.true;
    });

    it('finds config section in package.json', function () {
      fs.writeFileSync(path.join(fixturesDir, 'package.json'), '{"eslintConfig": {}}', {encoding: 'utf-8'});
      expect(rc._eslintConfigExists(fixturesDir)).to.be.true;
    });
    
  });

  describe('negative tests', function () {

    var fixturesDir = path.join(__dirname, '/fixtures/eslintConfig');

    beforeEach(function(){
      fs.mkdirsSync(fixturesDir);
    });
    afterEach(function(){
      fs.removeSync(fixturesDir);
    });

    it('knows when there is no config files available', function () {
      expect(rc._eslintConfigExists(fixturesDir)).to.be.false;
    });

    it('fails for package.json that does not contain eslintConfig section', function () {
      fs.writeFileSync(path.join(fixturesDir, 'package.json'), '{"hello": {}}', {encoding: 'utf-8'});
      expect(rc._eslintConfigExists(fixturesDir)).to.be.false;
    });

  });
});
