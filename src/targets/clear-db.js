var TargetBase = require('./base').TargetBase,
    TargetClearDb = function (options) {
        this.init(options);
    };

TargetClearDb.prototype = Object.create(TargetBase.prototype);
TargetClearDb.prototype.init = function (options) {
    [
        require('../tasks/init'),
        require('../tasks/clear-db'),
        require('../tasks/finalize')
   ].forEach(function (task) {
        this.addTask(task);
    }, this);

    TargetBase.prototype.init.call(this, options);
};

TargetClearDb.prototype.getName = function () {
    return 'CLEAR DATABASE';
};

exports.TargetClearDb = TargetClearDb;
