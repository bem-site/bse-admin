var util = require('util'),
    vow = require('vow'),
    logger = require('../logger'),
    levelDb = require('../providers/level-db');

module.exports = function (target) {
    logger.info(util.format('FINAL: ||| %s ||| HAS BEEN FINISHED SUCCESSFULLY', target.getName()), module);
    return levelDb.get().disconnect()
        .then(function () {
            return vow.resolve(target);
        });
};
