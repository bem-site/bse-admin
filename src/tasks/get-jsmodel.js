var vow = require('vow'),
    vowFs = require('vow-fs'),
    logger = require('../logger');

module.exports = function(target) {
    logger.info('Start to retrieve js model from model folder', module);
    try {
        var map = require(target.MODEL_JSPATH).get();
        return vowFs.makeDir(target.MODEL_CACHE_DIR).then(function() {
            return vowFs.write(target.MODEL_FILE_PATH, JSON.stringify(map)).then(function() {
                logger.info('Model was successfully retrieved and written to intermediate json file in cache folder', module);
                return vow.resolve(target);
            });
        });
    } catch (err) {
        logger.error('No js model were found', module);
        return vow.reject(err);
    }
};
