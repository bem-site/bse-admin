'use strict';

var fs = require('fs'),
    path = require('path'),
    zlib = require('zlib'),
    logger = require('../logger'),

    MODEL_PATH = path.join(process.cwd(), 'cache', 'model/model.json');

module.exports = function (req, res) {
    var gunzip = zlib.createGunzip(),
        onSuccess = function () {
            logger.debug('new model has been received', module);
            res.status(200).send('ok');
        },
        onError = function (err) {
            logger.error('error occur while receiving new model file', module);
            res.status(500).send('error ' + err);
        };

    req
        .pipe(gunzip)
        .pipe(fs.createWriteStream(MODEL_PATH))
        .on('error', onError)
        .on('close', onSuccess)
        .on('end', onSuccess);
};
