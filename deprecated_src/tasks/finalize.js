var util = require('util'),
    vow = require('vow'),
    logger = require('../logger');

module.exports = function (target) {
    logger.info(util.format('FINAL: ||| %s ||| HAS BEEN FINISHED SUCCESSFULLY', target.getName()), module);
    return vow.resolve(target);
};
