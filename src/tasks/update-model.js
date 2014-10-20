'use strict';

var fs = require('fs'),
    util = require('util'),
    zlib = require('zlib'),

    request = require('request'),
    vow = require('vow'),

    logger = require('../logger');

function send(target) {
    var def = vow.defer(),
        gzip = zlib.createGzip(),
        options = target.getOptions();

    if (!options.url) {
        var errorMessage = 'url parameter was not set';
        logger.error(errorMessage, module);
        return vow.reject(errorMessage);
    }

    fs.createReadStream(target.MODEL_FILE_PATH)
        .pipe(gzip)
        .pipe(request.post(options.url))
        .on('error', function (err) {
            logger.error(util.format('model send error %s', err), module);
            def.reject(err);
        })
        .on('end', function () {
            logger.info(util.format('model send to %s', options.url), module);
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
            logger.error(util.format('Sending model failed with error', err.message), module);
            return vow.reject(err);
        });
};
