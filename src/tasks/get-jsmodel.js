var vow = require('vow'),
    vowFs = require('vow-fs'),

    errors = require('../errors').TaskGetJsModel,
    logger = require('../logger');

module.exports = function (target) {
    logger.info('Start to retrieve js model from model folder', module);
    try {
        var map = require(target.MODEL_JSPATH).get();
        return vowFs.makeDir(target.MODEL_CACHE_DIR).then(function () {
            return vowFs.write(target.MODEL_FILE_PATH, JSON.stringify(map)).then(function () {
                logger.info(
                    'Model was successfully retrieved and written to intermediate json file in cache folder', module);
                return vow.resolve(target);
            });
        });
    } catch (err) {
        errors.createError(errors.CODES.COMMON, { err: err }).log();
        return vow.reject(err);
    }
};
