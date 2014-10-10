var path = require('path'),
    TargetBase = require('./base').TargetBase,
    TargetNodes = function(options) {
        this.init(options);
    };

TargetNodes.prototype = Object.create(TargetBase.prototype);
TargetNodes.prototype.MODEL_FILE_PATH = path.join(TargetNodes.prototype.CACHE_DIR, 'model', 'model.json');
TargetNodes.prototype.LIBRARIES_FILE_PATH = path.join(TargetNodes.prototype.CACHE_DIR, 'libraries');
TargetNodes.prototype.init = function(options) {
    [
        require('../tasks/init'),
        require('../tasks/nodes'),
        require('../tasks/docs'),
        require('../tasks/people'),
        require('../tasks/libraries-cache'),
        require('../tasks/libraries-files'),
        require('../tasks/libraries-db'),
        require('../tasks/override-links'),
        require('../tasks/sitemap-xml'),
        require('../tasks/snapshot'),
        require('../tasks/finalize')
    ].forEach(function(task) {
        this.addTask(task);
    }, this);

    TargetBase.prototype.init.call(this, options);
};

TargetNodes.prototype.getName = function() {
    return 'NODES SYNCHRONIZATION';
};

exports.TargetNodes = TargetNodes;
