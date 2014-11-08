'use strict';

var fs = require('fs'),
    url = require('url'),
    util = require('util'),
    zlib = require('zlib'),

    request = require('request'),
    vow = require('vow'),

    errors = require('../errors').TaskUpdateModel,
    config = require('../config'),
    logger = require('../logger');

/**
 * Reads model.json file, compress it and send to configured destination
 * @param {TargetUpdateModel} target object
 * @returns {*}
 */
function send(target) {
    var def = vow.defer(),
        gzip = zlib.createGzip(),
        provider = config.get('provider') || { host: '127.0.0.1', port: 3001 },
        options = target.getOptions(),
        host = options.host || provider.host,
        port = options.port || provider.port,
        link = url.format({
            protocol: 'http',
            hostname: host,
            port: port,
            pathname: '/model'
        });

    fs.createReadStream(target.MODEL_FILE_PATH)
        .pipe(gzip)
        .pipe(request.post(link))
        .on('error', function (err) {
            errors.createError(errors.CODES.STREAMING, { err: err }).log();
            def.reject(err);
        })
        .on('end', function () {
            logger.info(util.format('model send to %s', link), module);
            def.resolve(target);
        });

    return def.promise();
}

module.exports = function (target) {
    return send(target)
        .then(function () {
            logger.info(util.format('Model has been successfully sent'), module);
            return vow.resolve(target);
        })
        .fail(function (err) {
            errors.createError(errors.CODES.COMMON, { err: err }).log();
            return vow.reject(err);
        });
};
