'use strict';

var util = require('util'),
    path = require('path'),

    vow = require('vow'),
    vowFs = require('vow-fs'),

    logger = require('../logger'),

    DB_PATH = path.join(process.cwd(), 'db');

module.exports = function (req, res) {
    var environment = req.params.environment || 'testing',
        version = req.params.version;

    logger.info(util.format('set controller action %s with params: %s %s', req.path, environment, version), module);

    if (!version) {
        var error = 'required param version was not set';
        logger.info(error, module);
        res.status(500).end(error);
    }

    var promise = vowFs.exists(path.join(DB_PATH, environment)).then(function (exists) {
        if (!exists) {
            return vow.resolve();
        }
        return vowFs.remove(path.join(DB_PATH, environment));
    });

    return promise.then(function () {
        return vowFs.symLink(util.format('./snapshots/%s', version), path.join(DB_PATH, environment), 'dir')
            .then(function () {
                logger.info(
                    util.format('symlink for %s environment was set to %s version', environment, version), module);
                return res.redirect(302, '/');
            })
            .fail(function (err) {
                return res.status(500).end(err);
            });
    });
};
