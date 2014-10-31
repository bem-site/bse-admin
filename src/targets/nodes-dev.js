var TargetBase = require('./base').TargetBase,
    TargetNodes = require('./base').TargetNodes,
    TargetNodesDev = function (options) {
        this.init(options);
    };

TargetNodesDev.prototype = Object.create(TargetNodes.prototype);

TargetNodesDev.prototype.init = function (options) {
    var tasks = [
        require('../tasks/init'),
        require('../tasks/get-jsmodel'),
        require('../tasks/nodes'),
        require('../tasks/rm-model'),
        require('../tasks/docs'),
        require('../tasks/people'),
        require('../tasks/dynamic-people'),
        require('../tasks/dynamic-tags'),
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

TargetNodesDev.prototype.getName = function () {
    return 'NODES DEV SYNCHRONIZATION';
};

exports.TargetNodesDev = TargetNodesDev;
