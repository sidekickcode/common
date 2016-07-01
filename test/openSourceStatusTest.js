const oss = require("../openSourceStatus");

describe.only("openSourceStatus", function() {

  it("rejects for unresolvable domains", function() {
    return assert.isRejected(assertOpenSource('https://sidekicktest@xaomsadoim.notathing/sidekicktest2/private.git'));
  })

  it("rejects for missing repos", function() {
    return assert.isRejected(assertOpenSource('https://zximxcoizmzxoicaosijdqowijd@bitbucket.org/noasjdoiajsdt.git'));
  })
    

  describe("detecting open source status for github", function() {

    describe("open source", function() {
      it("works with HTTPs URLs", function() {
        return assertOpenSource('https://github.com/sidekickcode/tracker.git');
      })

      it("works with SSL URLs", function() {
        return assertOpenSource('git@github.com:sidekickcode/tracker.git' );
        
      })
          
    })

    describe("closed source", function() {
      it("works with HTTPs URLs", function() {
        return assertNotOpenSource('https://github.com/timruffles/sk-deployed.git');
      })

      it("works with SSL URLs", function() {
        return assertNotOpenSource('git@github.com:timruffles/sk-deployed.git');
      })
          
    })

      
  })

  describe("detecting open source status for bitbucket", function() {

    describe("open source", function() {
      it("works with HTTPs URLs", function() {
        return assertOpenSource('https://sidekicktest@bitbucket.org/sidekicktest/public.git');
      })

      it("works with SSL URLs", function() {
        return assertOpenSource('git@bitbucket.org:sidekicktest/public.git');
        
      })
          
    })

    describe("closed source", function() {
      it("works with HTTPs URLs", function() {
        return assertNotOpenSource('https://sidekicktest@bitbucket.org/sidekicktest2/private.git');
      })

      it("works with SSL URLs", function() {
        return assertNotOpenSource('git@bitbucket.org:sidekicktest2/private.git');
      })
          
    })

  })


})

function getOssStatus(url) {
  return oss.isOpenSource(url);
}

function assertOpenSource(url) {
  return getOssStatus(url).then(s => assert.isTrue(s, `expected ${url} to be oss`));
}

function assertNotOpenSource(url) {
  return getOssStatus(url).then(s => assert.isFalse(s, `expected ${url} not to be oss`));
}
