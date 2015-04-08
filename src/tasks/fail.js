var util = require('util'),
    vow = require('vow'),
    logger = require('../logger'),
    levelDb = require('../providers/level-db');

module.exports = function (target, error) {
    logger.error(util.format('FINAL: ||| %s ||| HAS BEEN FAILED', target.getName()), module);
    logger.error(error.message, module);
    return levelDb.get().disconnect()
        .then(function () {
            return vow.reject(target);
        });
};
