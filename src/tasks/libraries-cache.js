var path = require('path'),
    vow = require('vow'),

    errors = require('../errors').TaskLibrariesCache,
    logger = require('../logger'),
    utility = require('../util');

module.exports = function (target) {
    var options = target.getOptions();

    if (!options.noCache) {
        return vow.resolve();
    }

    var p = target.LIBRARIES_FILE_PATH;
    if (options.lib) {
        p = path.join(target.LIBRARIES_FILE_PATH, options.lib);
    }
    if (options.version) {
        p = path.join(target.LIBRARIES_FILE_PATH, options.lib, options.version);
    }

    return utility.removeDir(p)
        .then(function () {
            logger.info('Libraries cache was cleaned successfully', module);
            return vow.resolve(target);
        })
        .fail(function (err) {
            errors.createError(errors.CODES.COMMON, { err: err }).log();
            return vow.reject(err);
        });
};
