var path = require('path'),
    TargetBase = require('./base').TargetBase,
    TargetLibraries = function(options) {
        this.init(options);
    };

TargetLibraries.prototype = Object.create(TargetBase.prototype);
TargetLibraries.prototype.LIBRARIES_FILE_PATH = path.join(TargetLibraries.prototype.CACHE_DIR, 'libraries');
TargetLibraries.prototype.init = function(options) {
    [
        require('../tasks/init'),
        require('../tasks/libraries-cache'),
        require('../tasks/libraries-files'),
        require('../tasks/libraries-db'),
        require('../tasks/urls-map'),
        require('../tasks/override-links'),
        require('../tasks/sitemap-xml'),
        require('../tasks/snapshot'),
        require('../tasks/finalize')
    ].forEach(function(task) {
        this.addTask(task);
    }, this);

    TargetBase.prototype.init.call(this, options);
};

TargetLibraries.prototype.getName = function() {
    return 'LIBRARIES SYNCHRONIZATION';
};

exports.TargetLibraries = TargetLibraries;
