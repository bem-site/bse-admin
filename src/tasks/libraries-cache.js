var util = require('util'),
    path = require('path'),
    vow = require('vow'),

    logger = require('../logger'),
    utility = require('../util');

module.exports = function(target) {
    var promise = vow.resolve(),
        options = target.getOptions();

    if(options.noCache) {
        var p = target.CACHE_DIR;
        if (options.lib) {
            p = path.join(target.CACHE_DIR, options.lib);
        }
        if (options.version) {
            p = path.join(target.CACHE_DIR, options.lib, options.version);
        }
        promise = utility.removeDir(p);
    }

    return promise
        .then(function() {
            logger.info('Libraries cache was cleaned successfully', module);
            return vow.resolve(target);
        })
        .fail(function(err) {
            logger.error(util.format('Libraries cache clean failed with error %s', err.message), module);
            return vow.reject(err);
        });
};
