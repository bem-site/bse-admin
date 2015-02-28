var vow = require('vow'),
    should = require('should'),
    Target = require('../../src/targets/base'),
    Changes = require('../../src/model/changes'),
    target,
    task1,
    task2;

describe('describe task base', function () {
    before(function () {
        target = new Target({});
        task1 = function (t) {
            t.getChanges().getDocs().addAdded(1);
            t.result = 1;
            return vow.resolve(t);
        };
        task2 = function (t) {
            t.getChanges().getDocs().addAdded(1);
            t.result = 2;
            return vow.resolve(t);
        };
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

    it('should add tasks', function () {
        target.addTask(task1);
        target.addTask(task2);
        target.getTasks().should.be.ok;
        target.getTasks().should.be.instanceOf(Array).and.have.length(2);
    });

    it('should execute tasks', function () {
        target.execute().then(function (t) {
            t.result.should.equal(2);
            t.getChanges().getDocs().getAdded().should.be.instanceOf(Array).and.have.length(2);
        })
    });

    it('should clear changes', function () {
        var r = target.clearChanges();
        r.should.be.instanceOf(Target);
        r.getChanges().getDocs().getAdded().should.be.instanceOf(Array).and.have.length(0);
    });

    it('should init target with empty options if they were not given', function () {
        var t = new Target();
        t.getOptions().should.be.empty;
    });
});
