var should = require('should'),
    Target = require('../../src/targets/base'),
    Changes = require('../../src/model/changes'),
    target;

describe('describe task base', function () {
    before(function () {
        target = new Target({});
    });

    it('should have valid name', function () {
        target.getName().should.equal('BASE');
    });

    it('should have no tasks', function () {
        (target.getTasks() === undefined).should.be.ok;
    });

    it('should return changes model', function () {
        target.getChanges().should.be.ok;
        target.getChanges().should.be.instanceOf(Changes);
    });

    it('should have options', function () {
        target.getOptions().should.be.ok;
    });

    it('options should be empty', function () {
        target.getOptions().should.be.empty;
    });

    it('should not have snapshot name at initial state', function () {
        (target.getSnapshotName() === undefined).should.be.ok;
    });

    it('should can set snapshot name', function () {
        var r = target.setSnapshotName('11:2:2015-16:28:54');
        r.should.be.instanceOf(Target);
        r.snapshot.should.be.ok;
    });

    it('should have snapshot name after it was set', function () {
        target.getSnapshotName().should.equal('11:2:2015-16:28:54');
    });
});
