'use strict';

var util = require('util'),
    path = require('path'),

    logger = require('../logger'),
    utility = require('../util'),

    DB_PATH = path.join(process.cwd(), 'db');

module.exports = function (req, res) {
    var environment = req.params.environment || 'testing';
    logger.info(util.format('ping controller action %s with params: %s', req.path, environment), module);

    return utility.realpath(path.join(DB_PATH, environment))
        .then(function (realPath) {
            return res.status(200).end(realPath.split('/').pop());
        })
        .fail(function () {
            return res.status(500).end('No snapshots were found');
        });
};
