'use strict';

var util = require('util'),
    path = require('path'),

    _ = require('lodash'),
    vow = require('vow'),
    vowFs = require('vow-fs'),

    logger = require('../../logger'),
    levelDb = require('../../level-db'),
    nodes = require('../../model/nodes/index.js'),

    CACHE_DIR = path.join(process.cwd(), 'cache', 'libraries'),
    KEY = {
        NODE_PREFIX: 'nodes:',
        BLOCKS_PREFIX: 'blocks:'
    };

function loadVersionFile(lib, version) {
    return vowFs.read(path.join(CACHE_DIR, lib, version, 'data.json'), 'utf-8')
        .then(function(content) {
            try {
                return JSON.parse(content);
            } catch (err) {
                return null;
            }
        });
}

function loadLibraryNodeFromDb(lib) {

}

function removeLibraryVersionNodesFromDb(lib, version) {
    return levelDb
        .getByCriteria(function(record) {
            var key = record.key,
                value = record.value,
                route;

            if(key.indexOf(KEY.NODE_PREFIX) < 0 || !_.isObject(value)) {
                return false;
            }

            value = JSON.parse(value);
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

function addLibraryVersionNodesToDb(lib, version) {
    logger.debug(util.format('add lib: %s version: %s to db', lib, version), module);
    return vow.all([
        loadLibraryNodeFromDb(lib),
        loadVersionFile(lib, version)
    ]).spread(function(libNode, versionData) {
        return (new nodes.version.VersionNode(libNode, versionData)).saveToDb();
    });
}

module.exports = function(changes) {
    var versionsForRemove = changes.getLibraries().getRemoved()
            .concat(changes.getLibraries().getModified())
            .filter(function(item) {
                return item.version;
            }),
        versionsForAdd = changes.getLibraries().getAdded()
            .concat(changes.getLibraries().getModified())
            .filter(function(item) {
                return item.version;
            }),
        promiseRemove = function() {
            return vow.all(versionsForRemove.map(function(item) {
                return removeLibraryVersionNodesFromDb(item.lib, item.version);
            }));
        },
        promiseAdd = function() {
            return vow.all(versionsForAdd.map(function(item) {
                return addLibraryVersionNodesToDb(item.lib, item.version);
            }));
        };

    return promiseRemove().then(promiseAdd);
};
