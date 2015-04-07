var path = require('path'),
    TargetBase = require('./base'),
    Target = function (options) {
        this.init(options);
    };

Target.prototype = Object.create(TargetBase.prototype);
Target.prototype.MODEL_CACHE_DIR = path.join(Target.prototype.CACHE_DIR, 'model');
Target.prototype.MODEL_FILE_PATH = path.join(Target.prototype.CACHE_DIR, 'model', 'model.json');
Target.prototype.MODEL_JSPATH = path.join(process.cwd(), 'model', 'index.js');
Target.prototype.LIBRARIES_FILE_PATH = path.join(Target.prototype.CACHE_DIR, 'libraries');

Target.prototype.init = function (options) {
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
        require('../tasks/finalize')
   ];

    tasks.forEach(function (task) {
        this.addTask(task);
    }, this);

    TargetBase.prototype.init.call(this, options);
};

Target.prototype.getName = function () {
    return 'NODES SYNCHRONIZATION';
};

module.exports = Target;
