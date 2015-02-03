var path = require('path'),
    TargetBase = require('./base').TargetBase,
    TargetNodes = function (options) {
        this.init(options);
    };

TargetNodes.prototype = Object.create(TargetBase.prototype);
TargetNodes.prototype.MODEL_CACHE_DIR = path.join(TargetNodes.prototype.CACHE_DIR, 'model');
TargetNodes.prototype.MODEL_FILE_PATH = path.join(TargetNodes.prototype.CACHE_DIR, 'model', 'model.json');
TargetNodes.prototype.MODEL_JSPATH = path.join(process.cwd(), 'model', 'index.js');
TargetNodes.prototype.LIBRARIES_FILE_PATH = path.join(TargetNodes.prototype.CACHE_DIR, 'libraries');

TargetNodes.prototype.init = function (options) {
    var tasks = [
        require('../tasks/init'),
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
        require('../tasks/sitemap-xml'),
        // require('../tasks/search-data'),
        require('../tasks/snapshot'),
        require('../tasks/send-to-mds'),
        require('../tasks/switch-symlink'),
        require('../tasks/send-email'),
        require('../tasks/finalize')
    ];

    tasks.forEach(function (task) {
        this.addTask(task);
    }, this);

    TargetBase.prototype.init.call(this, options);
};

TargetNodes.prototype.getName = function () {
    return 'NODES SYNCHRONIZATION';
};

exports.TargetNodes = TargetNodes;
