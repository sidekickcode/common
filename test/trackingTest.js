var proxyquire = require("proxyquire");

var tracking = proxyquire("../tracking", {
  "./persistentConfig": {
    get: function(k) {
      if(k === "clientId") {
        return "1234";
      }
      throw new Error("key not stubbed");
    },
    '@noCallThru': true,
  },
})
var _ = require("lodash");

describe('tracking', function() {

  tracking.start({
    analyticsPhonyDomain() { return "sidekick.phony" },
    version() { return "1.0.0" },
    googleAnalyticsUa() { return "ABC" },
  });

  describe('events', function() {
    it('can track events', function() {
      return tracking.event("snail", "thingy")
    })

    it('can track events with labels', function() {
      return tracking.event("snail", "thingy", {
        label: "other thing",
      })
    })
      
  })

  it('can track exceptions', function() {
    return tracking.error(new Error("thing"));
  })

  it('create exception context limited to 150 characters', function() {
    var trace = tracking._cleansedStackTrack(new Error);
    assert(trace.length > 100, "weirdly short");
    assert(trace.length <= 150, "too long");
  })


  it('can track page views', function() {
    return tracking.pageView("/some-page");
  })
    
})
