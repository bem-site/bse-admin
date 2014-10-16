'use strict';

var util = require('util'),
    path = require('path'),
    zlib = require('zlib'),

    fstream = require('fstream'),
    tar = require('tar'),

    logger = require('../logger'),

    DB_PATH = path.join(process.cwd(), 'db');

module.exports = function(req, res) {
    var environment = req.params.environment || 'testing';
    logger.info(util.format('data controller action %s with params: %s', req.path, environment), module);

    fstream.Reader({ path: path.join(DB_PATH, environment), type: 'Directory' })
        .pipe(tar.Pack())
        .pipe(zlib.Gzip())
        .pipe(res)
        .on('error', function (err) {
            logger.error(util.format('load data error %s for', err, environment), module);
        })
        .on('close', function () {
            logger.info(util.format('data send for %s', environment), module);
        })
        .on('end', function () {
            logger.info(util.format('data send for %s', environment), module);
        });
};
