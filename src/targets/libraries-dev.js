var TargetBase = require('./base').TargetBase,
    TargetNodes = require('./nodes').TargetNodes,
    TargetLibrariesDev = function (options) {
        this.init(options);
    };

TargetLibrariesDev.prototype = Object.create(TargetNodes.prototype);

TargetLibrariesDev.prototype.init = function (options) {
    var tasks = [
        require('../tasks/init'),
        require('../tasks/libraries-files'),
        require('../tasks/libraries-db'),
        require('../tasks/urls-map'),
        require('../tasks/override-links'),
        require('../tasks/finalize')
    ];

    tasks.forEach(function (task) {
        this.addTask(task);
    }, this);

    TargetBase.prototype.init.call(this, options);
};

TargetLibrariesDev.prototype.getName = function () {
    return 'LIBRARIES DEV SYNCHRONIZATION';
};

module.exports = TargetLibrariesDev;
