'use strict';

var util = require('util'),
    path = require('path'),

    vow = require('vow'),
    vowFs = require('vow-fs'),

    logger = require('../logger'),
    levelDb = require('../level-db'),
    nodes = require('../model/nodes/index.js');

function loadVersionFile(target, lib, version) {
    return vowFs.read(path.join(target.LIBRARIES_FILE_PATH, lib, version, 'data.json'), 'utf-8')
        .then(function(content) {
            try {
                return JSON.parse(content);
            } catch (err) {
                return null;
            }
        });
}

function loadLibraryNodeFromDb(target, lib) {
    return levelDb
        .getByCriteria(function(record) {
            var key = record.key,
                value = record.value;

            if(key.indexOf(target.KEY.NODE_PREFIX) < 0) {
                return false;
            }
            return value.lib === lib;
        });
}

function removeLibraryVersionNodesFromDb(target, lib, version) {
    logger.debug(util.format('remove lib: %s version: %s from db', lib, version), module);
    return levelDb
        .getByCriteria(function(record) {
            var key = record.key,
                value = record.value,
                route;

            if(key.indexOf(target.KEY.NODE_PREFIX) < 0) {
                return false;
            }

            route = value.route;
            if(!route || !route.conditions) {
                return false;
            }

            return route.conditions.lib === lib && route.conditions.version === version;
        })
        .then(function(result) {
            return levelDb.batch(result.map(function(record) {
                return { type: 'del', key: record.key };
            }));
        });
}

function addLibraryVersionNodesToDb(target, lib, version) {
    logger.debug(util.format('add lib: %s version: %s to db', lib, version), module);
    return vow.all([
        loadLibraryNodeFromDb(target, lib),
        loadVersionFile(target, lib, version)
    ]).spread(function(dbNodes, versionData) {
        var record = dbNodes[0];
        if(!record || !record.value) {
            return vow.resolve();
        }
        return (new nodes.version.VersionNode(record.value, versionData)).saveToDb();
    });
}

//TODO implement better db - file cache synchronization
module.exports = function(target) {
    var versionsForRemove = target.getChanges().getLibraries().getRemoved()
            .concat(target.getChanges().getLibraries().getModified())
            .filter(function(item) {
                return item.version;
            })
            .map(function(item) {
                return removeLibraryVersionNodesFromDb(target, item.lib, item.version);
            }),
        versionsForAdd = target.getChanges().getLibraries().getAdded()
            .concat(target.getChanges().getLibraries().getModified())
            .filter(function(item) {
                return item.version;
            })
            .map(function(item) {
                return addLibraryVersionNodesToDb(target, item.lib, item.version);
            });

    return vow.all(versionsForRemove)
        .then(function() {
            return vow.all(versionsForAdd);
        })
        .then(function() {
            logger.info('Libraries were synchronized  successfully with database', module);
            return vow.resolve(target);
        })
        .fail(function(err) {
            logger.error(util.format('Libraries synchronization with database failed with error %s', err.message), module);
            return vow.reject(err);
        });
};
