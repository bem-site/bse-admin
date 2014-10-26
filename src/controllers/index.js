'use strict';

var util = require('util'),
    path = require('path'),

    _ = require('lodash'),
    vow = require('vow'),
    vowFs = require('vow-fs'),

    logger = require('../logger'),
    template = require('../template'),
    utility = require('../util'),

    DB_PATH = path.join(process.cwd(), 'db'),
    SNAPSHOTS_PATH = path.join(DB_PATH, 'snapshots');

/**
 * Returns real path of environment symlinks
 * @param {String} environment
 * @returns {*}
 */
function getOrCreateSymlinks(environment) {
    return utility.realpath(path.join(DB_PATH, environment))
        .then(function (realPath) {
            return realPath;
        })
        .fail(function () {
            return vowFs.listDir(SNAPSHOTS_PATH)
                .then(function (snapshots) {
                    return vowFs.symLink('./snapshots/' + snapshots[0],
                        path.join(DB_PATH, environment), 'dir');
                })
                .then(function () {
                    return getOrCreateSymlinks(environment);
                })
                .fail(function (err) {
                    console.error(err);
                });
        });
}

function getData() {
    var result = { versions: [] };

    return vowFs.exists(SNAPSHOTS_PATH).then(function (exists) {
        if (!exists) {
            return result;
        }

        return vowFs.listDir(SNAPSHOTS_PATH).then(function (snapshots) {
            if (!snapshots.length) {
                return result;
            }
            return vow.all([
                    getOrCreateSymlinks('testing'),
                    getOrCreateSymlinks('production')
                ])
                .spread(function (testingPath, productionPath) {
                    testingPath = testingPath.split('/').pop();
                    productionPath = productionPath.split('/').pop();

                    result.versions = snapshots
                        .sort(function (a, b) {
                            var re = /(\d{1,2}):(\d{1,2}):(\d{1,4})-(\d{1,2}):(\d{1,2}):(\d{1,2})/;
                            a = a.match(re);
                            b = b.match(re);
                            a = new Date(a[3], a[2] - 1, a[1], a[4], a[5], a[6], 0);
                            b = new Date(b[3], b[2] - 1, b[1], b[4], b[5], b[6], 0);
                            return b.getTime() - a.getTime();
                        })
                        .map(function (item) {
                            return {
                                date: item,
                                changesUrl: util.format('/changes/%s', item),
                                testingUrl: util.format('/set/testing/%s', item),
                                productionUrl: util.format('/set/production/%s', item),
                                removeUrl: util.format('/remove/%s', item),
                                testing: item === testingPath,
                                production: item === productionPath
                            };
                        });

                    return result;
                });
        });
    });
}

exports.index = function (req, res) {
    logger.info(util.format('index controller action %s', req.path), module);

    return getData()
        .then(function (result) {
            return template.run(_.extend({ block: 'page', view: 'index' }, { data: result }), req);
        })
        .then(function (html) {
            res.status(200).end(html);
        })
        .fail(function (err) {
            res.status(500).end(err);
        });
};

exports.set = require('./set');
exports.ping = require('./ping');
exports.data = require('./data');
exports.model = require('./model');
exports.delete = require('./remove');
exports.changes = require('./changes');
