var TargetBase = require('./base'),
    TargetDocs = function(options) {
        this.init(options);
    };

TargetDocs.prototype = Object.create(TargetBase.prototype);
TargetDocs.prototype.init = function(options) {
    [
        require('../tasks/init'),
        require('../tasks/docs'),
        require('../tasks/people'),
        require('../tasks/override-links'),
        require('../tasks/sitemap-xml'),
        require('../tasks/snapshot')
    ].forEach(function(task) {
        this.addTask(task);
    }, this);

    TargetBase.prototype.init.call(this, options);
};

exports.TargetDocs = TargetDocs;
