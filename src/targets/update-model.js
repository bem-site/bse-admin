var path = require('path'),
    TargetBase = require('./base').TargetBase,
    TargetUpdateModel = function (options) {
        this.init(options);
    };

TargetUpdateModel.prototype = Object.create(TargetBase.prototype);
TargetUpdateModel.prototype.MODEL_JSPATH = path.join(process.cwd(), 'model', 'index.js');
TargetUpdateModel.prototype.MODEL_CACHE_DIR = path.join(TargetBase.prototype.CACHE_DIR, 'model');
TargetUpdateModel.prototype.MODEL_FILE_PATH = path.join(TargetUpdateModel.prototype.CACHE_DIR, 'model', 'model.json');
TargetUpdateModel.prototype.init = function (options) {
    [
        require('../tasks/get-jsmodel'),
        require('../tasks/update-model'),
        require('../tasks/finalize')
   ].forEach(function (task) {
            this.addTask(task);
        }, this);

    TargetBase.prototype.init.call(this, options);
};

TargetUpdateModel.prototype.getName = function () {
    return 'UPDATE MODEL';
};

exports.TargetUpdateModel = TargetUpdateModel;
