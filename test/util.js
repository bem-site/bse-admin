var util = require('../src/util.js');

describe('util functions', function () {
    /*
    it('should convert date to milliseconds', function () {
        util.dateToMilliseconds('13-02-2015').should.equal(1423771200000);
        util.dateToMilliseconds('07-05-2013').should.equal(1367866800000);
    });
    */

    it('should return valid array with languages', function () {
        util.getLanguages().should.be.instanceOf(Array).and.have.length(2);
        util.getLanguages().indexOf('en').should.equal(0);
        util.getLanguages().indexOf('ru').should.equal(1);
    });
});
