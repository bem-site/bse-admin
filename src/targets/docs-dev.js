var TargetBase = require('./base'),
    TargetNodes = require('./nodes'),
    Target = function (options) {
        this.init(options);
    };

Target.prototype = Object.create(TargetNodes.prototype);

Target.prototype.init = function (options) {
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

Target.prototype.getName = function () {
    return 'DOCS DEV SYNCHRONIZATION';
};

module.exports = Target;
