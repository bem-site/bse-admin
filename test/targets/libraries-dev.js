var should = require('should'),
    Base = require('../../src/targets/base'),
    Target = require('../../src/targets/libraries-dev'),
    target;

describe('describe task libraries-dev', function () {
    before(function () {
        target = new Target({});
    });

    it('should be inheritance of base target', function () {
        target.__proto__.should.be.instanceof(Base)
    });

    it('should have valid name', function () {
        target.getName().should.equal('LIBRARIES DEV SYNCHRONIZATION');
    });

    it('should have valid tasks number', function () {
        target.getTasks().should.be.instanceof(Array).and.have.length(7);
    });
});
