var path = require('path'),
    should = require('should'),
    constants = require('../src/constants');

describe('constants', function () {
    it('should be instance of Object', function () {
        constants.should.be.instanceof(Object);
    });

    it('should have property DIRECTORY', function () {
        constants.should.have.property('DIRECTORY');
    });

    it('should have property DIRECTORY.CACHE', function () {
        constants.DIRECTORY.should.have.property('CACHE');
    });

    it('should have property DIRECTORY.MODEL', function () {
        constants.DIRECTORY.should.have.property('MODEL');
    });

    it('should have property GITHUB', function () {
        constants.should.have.property('GITHUB');
    });

    it('should have property GITHUB.PRIVATE', function () {
        constants.GITHUB.should.have.property('PRIVATE');
    });

    it('should have property GITHUB.PUBLIC', function () {
        constants.GITHUB.should.have.property('PUBLIC');
    });

    it('should have property REGISTRY_KEY', function () {
        constants.should.have.property('REGISTRY_KEY');
    });

    it('should have property DIRECTORY.CACHE equal to "cache"', function () {
        constants.DIRECTORY.CACHE.should.equal(path.join(process.cwd(), 'cache'));
    });

    it('should have property DIRECTORY.MODEL equal to "model"', function () {
        constants.DIRECTORY.MODEL.should.equal(path.join(process.cwd(), 'model'));
    });

    it('should have property GITHUB.PRIVATE equal to "github.yandex-team.ru"', function () {
        constants.GITHUB.PRIVATE.should.equal('github.yandex-team.ru');
    });

    it('should have property GITHUB.PUBLIC equal to "github.com"', function () {
        constants.GITHUB.PUBLIC.should.equal('github.com');
    });

    it('should have property REGISTRY_KEY equal to "root"', function () {
        constants.REGISTRY_KEY.should.equal('root');
    });
});
