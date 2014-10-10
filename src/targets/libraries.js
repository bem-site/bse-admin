var path = require('path'),
    TargetBase = require('./base'),
    TargetLibraries = function(options) {
        this.init(options);
    };

TargetLibraries.prototype = Object.create(TargetBase.prototype);
TargetLibraries.prototype.CACHE_DIR = path.join(process.cwd(), 'cache', 'libraries');
TargetLibraries.prototype.init = function(options) {
    [
        require('../tasks/init'),
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

exports.TargetLibraries = TargetLibraries;
