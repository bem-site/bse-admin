'use strict';

var util = require('util'),
    path = require('path'),
    fs = require('fs'),

    vowFs = require('vow-fs'),

    logger = require('../logger'),
    utility = require('../util'),

    DB_PATH = path.join(process.cwd(), 'db');

exports.ping = function (req, res) {
    var environment = req.params.environment || 'testing';
    logger.info(util.format('search ping controller action %s with params: %s', req.path, environment), module);

    return utility.realpath(path.join(DB_PATH, environment))
        .then(function (realPath) {
            return res.status(200).end(realPath.split('/').pop());
        })
        .fail(function () {
            return res.status(500).end('error');
        });
};

exports.libraries = function (req, res) {
    var environment = req.params.environment || 'testing';
    logger.info(util.format('search libraries controller action %s with params: %s', req.path, environment), module);

    var filePath = path.join(DB_PATH, environment, 'libraries.json');
    return vowFs.exists(filePath)
        .then(function (exists) {
            if (!exists) {
                return res.status(404).end('libraries.json file was not found on filesystem');
            }
            return fs.createReadStream(filePath).pipe(res);
        });
};

exports.blocks = function (req, res) {
    var environment = req.params.environment || 'testing';
    logger.info(util.format('search blocks controller action %s with params: %s', req.path, environment), module);

    var filePath = path.join(DB_PATH, environment, 'blocks.json');
    return vowFs.exists(filePath)
        .then(function (exists) {
            if (!exists) {
                return res.status(404).end('blocks.json file was not found on filesystem');
            }
            return fs.createReadStream(filePath).pipe(res);
        });
};
