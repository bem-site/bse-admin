var util = require('util'),
    vow = require('vow'),
    vowFs = require('vow-fs'),
    logger = require('../logger');

module.exports = function(target) {
    logger.info('Start to remove model.json file', module);
    return vowFs.exists(target.MODEL_FILE_PATH)
        .then(function(exists) {
            return exists ? vowFs.remove(target.MODEL_FILE_PATH) : vow.resolve({ removed: true });
        })
        .then(function(res) {
            if(!res || !res.removed) {
                logger.info(util.format('Model file was successfully removed from %s', target.MODEL_FILE_PATH), module);
            }
            return vow.resolve(target);
        })
        .fail(function(err) {
            logger.error('Error occur while removing model file', module);
            return vow.reject(err);
        });
};
