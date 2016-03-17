const universal = require("../universal");

describe('universal', function() {

  describe('isRenderer', function() {

    it('detects we are not in renderer', function() {
      assert.isFalse(universal.isRenderer());
    })


      
  })

  it('gives me access to process in node', function() {
    assert.equal(universal.nodeProcess(), process);
  })

    
})
