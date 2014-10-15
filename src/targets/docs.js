var TargetBase = require('./base').TargetBase,
    TargetDocs = function(options) {
        this.init(options);
    };

TargetDocs.prototype = Object.create(TargetBase.prototype);
TargetDocs.prototype.init = function(options) {
    [
        require('../tasks/init'),
        require('../tasks/docs'),
        require('../tasks/people'),
        require('../tasks/dynamic-people'),
        require('../tasks/dynamic-tags'),
        require('../tasks/override-links'),
        require('../tasks/sitemap-xml'),
        require('../tasks/snapshot'),
        require('../tasks/finalize')
    ].forEach(function(task) {
        this.addTask(task);
    }, this);

    TargetBase.prototype.init.call(this, options);
};

TargetDocs.prototype.getName = function() {
    return 'DOCS SYNCHRONIZATION';
};

exports.TargetDocs = TargetDocs;
