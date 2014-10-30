'use strict';

var util = require('util'),
    path = require('path'),

    _ = require('lodash'),
    vowFs = require('vow-fs'),
    logger = require('../logger'),
    template = require('../template'),

    DB_PATH = path.join(process.cwd(), 'db', 'snapshots');

module.exports = function (req, res) {
    var version = req.params.version;

    logger.info(util.format('changes controller action %s with params: %s', req.path, version), module);

    if (!version) {
        var error = 'required param version was not set';
        logger.info(error, module);
        res.status(500).end(error);
    }

    return vowFs.read(path.join(DB_PATH, version, 'data.json'), 'utf-8')
        .then(function (content) {
            return template.run(_.extend({ block: 'page', view: 'changes' }, { data: JSON.parse(content) }), req);
        })
        .then(function (html) {
            res.status(200).end(html);
        })
        .fail(function (err) {
            return res.status(500).end(err);
        });
};
