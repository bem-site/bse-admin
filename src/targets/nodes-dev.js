var path = require('path'),
    TargetBase = require('./base').TargetBase,
    TargetNodes = require('./nodes').TargetNodes,
    TargetNodesDev = function(options) {
        this.init(options);
    };

TargetNodesDev.prototype = Object.create(TargetNodes.prototype);
TargetNodesDev.prototype.MODEL_JSPATH = path.join(process.cwd(), 'model', 'index.js');
TargetNodesDev.prototype.init = function(options) {
    [
        require('../tasks/init'),
        require('../tasks/get-jsmodel'),
        require('../tasks/nodes'),
        require('../tasks/docs'),
        require('../tasks/people'),
        require('../tasks/libraries-cache'),
        require('../tasks/libraries-files'),
        require('../tasks/libraries-db'),
        require('../tasks/override-links'),
        require('../tasks/sitemap-xml'),
        require('../tasks/finalize')
    ].forEach(function(task) {
        this.addTask(task);
    }, this);

    TargetBase.prototype.init.call(this, options);
};

TargetNodes.prototype.getName = function() {
    return 'NODES DEV SYNCHRONIZATION';
};

exports.TargetNodesDev = TargetNodesDev;
