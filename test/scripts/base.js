var vow = require('vow'),
    should = require('should'),
    Script = require('../../src/scripts/base'),
    Changes = require('../../src/model/changes'),
    script,
    task1,
    task2;

describe('describe task base', function () {
    before(function () {
        script = new Script({});
        task1 = function (t) {
            t.getChanges().docs.addAdded(1);
            t.result = 1;
            return vow.resolve(t);
        };
        task2 = function (t) {
            t.getChanges().docs.addAdded(1);
            t.result = 2;
            return vow.resolve(t);
        };
    });

    it('should have valid name', function () {
        script.name.should.equal('BASE');
    });

    it('should have no tasks', function () {
        (script.tasks === undefined).should.be.ok;
    });

    it('should return changes model', function () {
        script.changes.should.be.ok;
        script.changes.should.be.instanceOf(Changes);
    });

    it('should have options', function () {
        script.options.should.be.ok;
    });

    it('options should be empty', function () {
        script.options.should.be.empty;
    });

    it('should add tasks', function () {
        script.addTask(task1);
        script.addTask(task2);
        script.tasks.should.be.ok;
        script.tasks.should.be.instanceOf(Array).and.have.length(2);
    });

    it('should execute tasks', function () {
        script.execute().then(function (t) {
            t.result.should.equal(2);
            t.changes.docs.added.should.be.instanceOf(Array).and.have.length(2);
        })
    });

    it('should clear changes', function () {
        var r = script.clearChanges();
        r.should.be.instanceOf(Script);
        r.changes.docs.added.should.be.instanceOf(Array).and.have.length(0);
    });

    it('should init script with empty options if they were not given', function () {
        var t = new Script();
        t.options.should.be.empty;
    });
});
