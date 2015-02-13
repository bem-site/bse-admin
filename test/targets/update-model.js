var should = require('should'),
    Base = require('../../src/targets/base'),
    Target = require('../../src/targets/update-model'),
    target;

describe('describe task update-model', function () {
    before(function () {
        target = new Target({});
    });

    it('should be inheritance of base target', function () {
        target.__proto__.should.be.instanceof(Base)
    });

    it('should have valid name', function () {
        target.getName().should.equal('UPDATE MODEL');
    });

    it('should have valid tasks number', function () {
        target.getTasks().should.be.instanceof(Array).and.have.length(3);
    });
});
