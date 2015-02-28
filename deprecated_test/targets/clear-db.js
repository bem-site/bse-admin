var should = require('should'),
    Base = require('../../src/targets/base'),
    Target = require('../../src/targets/clear-db'),
    target;

describe('describe task clear-db', function () {
    before(function () {
        target = new Target({});
    });

    it('should be inheritance of base target', function () {
        target.__proto__.should.be.instanceof(Base)
    });

    it('should have valid name', function () {
        target.getName().should.equal('CLEAR DATABASE');
    });

    it('should have valid tasks number', function () {
        target.getTasks().should.be.instanceof(Array).and.have.length(3);
    });
});
