var path = require('path'),
    TargetBase = require('./base'),
    Target = function (options) {
        this.init(options);
    };

Target.prototype = Object.create(TargetBase.prototype);
Target.prototype.MODEL_JSPATH = path.join(process.cwd(), 'model', 'index.js');
Target.prototype.MODEL_CACHE_DIR = path.join(TargetBase.prototype.CACHE_DIR, 'model');
Target.prototype.MODEL_FILE_PATH = path.join(Target.prototype.CACHE_DIR, 'model', 'model.json');
Target.prototype.init = function (options) {
    [
        require('../tasks/get-jsmodel'),
        require('../tasks/update-model'),
        require('../tasks/finalize')
   ].forEach(function (task) {
            this.addTask(task);
        }, this);

    TargetBase.prototype.init.call(this, options);
};

Target.prototype.getName = function () {
    return 'UPDATE MODEL';
};

module.exports = Target;
