var TargetBase = require('./base').TargetBase,
    TargetNodes = require('./nodes').TargetNodes,
    TargetDocsDev = function (options) {
        this.init(options);
    };

TargetDocsDev.prototype = Object.create(TargetNodes.prototype);

TargetDocsDev.prototype.init = function (options) {
    var tasks = [
        require('../tasks/init'),
        require('../tasks/docs'),
        require('../tasks/people'),
        require('../tasks/dynamic-people'),
        require('../tasks/dynamic-tags'),
        require('../tasks/urls-map'),
        require('../tasks/override-links'),
        require('../tasks/finalize')
    ];

    tasks.forEach(function (task) {
        this.addTask(task);
    }, this);

    TargetBase.prototype.init.call(this, options);
};

TargetDocsDev.prototype.getName = function () {
    return 'DOCS DEV SYNCHRONIZATION';
};

module.exports = TargetDocsDev;
