

const chai = require('chai');
global.assert = chai.assert;
global.expect = chai.expect;


const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
