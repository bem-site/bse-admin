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
        .then(function(realPath) {
            return realPath;
        })
        .fail(function() {
            return vowFs.listDir(SNAPSHOTS_PATH)
                .then(function(snapshots) {
                    return vowFs.symLink('./snapshots/' + snapshots[0],
                        path.join(DB_PATH, environment), 'dir');
                })
                .then(function() {
                    return getOrCreateSymlinks(environment);
                })
                .fail(function(err) {
                    console.error(err);
                });
        });
}

exports.index = function(req, res) {
    logger.info(util.format('index controller action %s', req.path), module);
    var result = { versions: [] };

    return vowFs.exists(SNAPSHOTS_PATH).then(function(exists) {
        if(!exists) {
            res.status(200).json(result);
            return;
        }

        return vowFs.listDir(SNAPSHOTS_PATH).then(function(snapshots) {
            if(!snapshots.length) {
                res.status(200).json(result);
                return;
            }

            return vow.all([
                    getOrCreateSymlinks('testing'),
                    getOrCreateSymlinks('production')
                ])
                .spread(function(testingPath, productionPath) {
                    testingPath = testingPath.split('/').pop();
                    productionPath = productionPath.split('/').pop();

                    result.versions = snapshots.map(function(item) {
                        var _item = {
                            date: item,
                            testingUrl: util.format('set/testing/%s', item),
                            productionUrl: util.format('set/production/%s', item)
                        };

                        if(item === testingPath) {
                            _item.testing = true;
                        }

                        if(item === productionPath) {
                            _item.production = true;
                        }
                        return _item;
                    });

                    return result;
                })
                .then(function(result) {
                    return template.run(
                        _.extend({ block: 'page', view: 'index' }, { data: result }), req)
                })
                .then(function (html) {
                    res.status(200).end(html);
                })
                .fail(function (err) {
                    res.status(500).end(err);
                });
        });
    });
};

exports.set = require('./set');
exports.ping = require('./ping');
exports.data = require('./data');

