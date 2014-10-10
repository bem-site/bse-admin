var path = require('path'),
    TargetBase = require('./base'),
    TargetNodes = function(options) {
        this.init(options);
    };

TargetNodes.prototype = Object.create(TargetBase.prototype);
TargetNodes.prototype.CACHE_DIR = path.join(process.cwd(), 'cache', 'model');
TargetNodes.prototype.MODEL_FILE_PATH = path.join(this.CACHE_DIR, 'model.json');
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
        require('../tasks/snapshot')
    ].forEach(function(task) {
        this.addTask(task);
    }, this);

    TargetBase.prototype.init.call(this, options);
};

exports.TargetNodes = TargetNodes;
