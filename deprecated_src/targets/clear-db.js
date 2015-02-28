var TargetBase = require('./base'),
    Target = function (options) {
        this.init(options);
    };

Target.prototype = Object.create(TargetBase.prototype);

/**
 * Initialize Target
 * @param {Object} options
 */
Target.prototype.init = function (options) {
    var tasks = [
        require('../tasks/init'),
        require('../tasks/clear-db'),
        require('../tasks/finalize')
    ];

    tasks.forEach(function (task) {
        this.addTask(task);
    }, this);

    TargetBase.prototype.init.call(this, options);
};

Target.prototype.getName = function () {
    return 'CLEAR DATABASE';
};

module.exports = Target;
