'use strict';

var util = require('util'),
    path = require('path'),

    logger = require('../logger'),
    utility = require('../util'),

    DB_PATH = path.join(process.cwd(), 'db', 'snapshots');

module.exports = function (req, res) {
    var version = req.params.version;

    logger.info(util.format('remove controller action %s with params: %s', req.path, version), module);

    if (!version) {
        var error = 'required param version was not set';
        logger.info(error, module);
        res.status(500).end(error);
    }

    // TODO implement server-side validation for prevent removing testing and production snapshots

    return utility.removeDir(path.join(DB_PATH, version))
        .then(function () {
            logger.info(
                util.format('snapshot version %s was removed from filesystem', version), module);
            return res.redirect(302, '/');
        })
        .fail(function (err) {
            return res.status(500).end(err);
        });
};
