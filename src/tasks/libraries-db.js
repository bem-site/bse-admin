'use strict';

var util = require('util'),
    path = require('path'),

    _ = require('lodash'),
    vow = require('vow'),
    vowFs = require('vow-fs'),

    logger = require('../logger'),
    levelDb = require('../level-db'),
    nodes = require('../model/nodes/index.js');

/**
 * Returns array of library nodes from database
 * @param {TargetLibraries} target object
 * @returns {*}
 */
function getLibraryNodesFromDb(target) {
    return levelDb
        .getByCriteria(function (record) {
            var key = record.key,
                value = record.value;

            if (key.indexOf(target.KEY.NODE_PREFIX) < 0) {
                return false;
            }

            // criteria - is existed field lib
            return value.lib;
        });
}

/**
 * Returns array of library version folders for current library
 * @param {TargetLibraries} target object
 * @param {Object} value - database record of library node
 * @returns {*}
 */
function getLibraryVersionsFromCache(target, value) {
    return vowFs.listDir(path.join(target.LIBRARIES_FILE_PATH, value.lib));
}

/**
 * Returns array of library version nodes from database
 * @param {TargetLibraries} target object
 * @param {Object} lib - database record of library node
 * @returns {*}
 */
function getLibraryVersionNodesFromDb(target, lib) {
    return levelDb
        .getByCriteria(function (record) {
            var key = record.key,
                value = record.value;

            if (key.indexOf(target.KEY.NODE_PREFIX) < 0) {
                return false;
            }

            // criteria is equality of parent and id fields of version and library nodes
            return value.parent === lib.id;
        });
}

/**
 * Collect map of contents of {lib}/{version}/_data.json files
 * @param {TargetLibraries} target object
 * @returns {*}
 */
function getPreviousStateMap(target) {
    var result = {};
    return vowFs.listDir(target.LIBRARIES_FILE_PATH).then(function (libraries) {
        return vow.all(libraries.map(function (lib) {
            return vowFs.listDir(path.join(target.LIBRARIES_FILE_PATH, lib)).then(function (versions) {
                return vow.all(versions.map(function (version) {
                    return vowFs.read(path.join(target.LIBRARIES_FILE_PATH, lib, version, '_data.json'), 'utf-8')
                        .then(function (content) {
                            result[lib] = result[lib] || {};
                            result[lib][version] = content;
                        });
                }));
            });
        }));
    }).then(function () {
        return result;
    });
}

function removeLibraryVersionNodesFromDb(target, lib, version) {
    logger.debug(util.format('remove lib: %s version: %s from db', lib, version), module);
    return levelDb
        .getByCriteria(function (record) {
            var key = record.key,
                value = record.value,
                route;

            if (key.indexOf(target.KEY.NODE_PREFIX) < 0) {
                return false;
            }

            route = value.route;
            if (!route || !route.conditions) {
                return false;
            }

            return route.conditions.lib === lib && !value.lib &&
                (version ? route.conditions.version === version : true);
        })
        .then(function (result) {
            return levelDb.batch(result.map(function (record) {
                return { type: 'del', key: record.key };
            }));
        });
}

/**
 * Loads data.json file from libraries cache {cache}/{lib}/{version}/data.json
 * @param {TargetLibraries} target object
 * @param {String} lib - library name
 * @param {String} version - library version name
 * @returns {*}
 */
function loadVersionFile(target, lib, version) {
    return vowFs.read(path.join(target.LIBRARIES_FILE_PATH, lib, version, 'data.json'), 'utf-8')
        .then(function (content) {
            try {
                return JSON.parse(content);
            } catch (err) {
                return null;
            }
        });
}

function syncLibraryVersions(target, record) {
    var key = record.key,
        value = record.value;
    return vow.all([
            getLibraryVersionsFromCache(target, value),
            getLibraryVersionNodesFromDb(target, value),
            getPreviousStateMap(target)
        ])
        .spread(function (newVersions, oldVersions, stateMap) {
            // hide library if there no  versions for it
            if (!newVersions.length) {
                util.getLanguages().forEach(function (lang) {
                    value.hidden[lang] = true;
                });
                return vow.all([
                    removeLibraryVersionNodesFromDb(target, value.lib),
                    levelDb.put(key, value)
                ]);
            }

            var added = [],
                modified = [],
                removed = [];

            newVersions.forEach(function (cacheVersion) {
                var dbRecord = _.find(oldVersions, function (record) {
                    var route = record.value.route,
                        conditions = route.conditions,
                        dbVersion = conditions.version;

                    return cacheVersion === dbVersion;
                });

                if (!dbRecord) {
                    added.push(cacheVersion);
                } else if (stateMap[value.lib] &&
                    stateMap[value.lib][cacheVersion] !== dbRecord.value.cacheVersion) {
                    modified.push(cacheVersion);
                }
            });

            oldVersions.forEach(function (record) {
                var cacheRecord = _.find(newVersions, function (cacheVersion) {
                    var route = record.value.route,
                        conditions = route.conditions,
                        dbVersion = conditions.version;

                    return cacheVersion === dbVersion;
                });

                if (!cacheRecord) {
                    removed.push(record);
                }
            });

            added = added.map(function (item) {
                logger.debug(util.format('add lib: %s version: %s to db', value.lib, item), module);
                return loadVersionFile(target, value.lib, item).then(function (versionData) {
                    return (new nodes.version.VersionNode(value, versionData, stateMap[value.lib][item])).saveToDb();
                });
            });

            modified = modified.map(function (item) {
                logger.debug(util.format('modify lib: %s version: %s into db', value.lib, item), module);
                return removeLibraryVersionNodesFromDb(target, value.lib, item)
                    .then(function () {
                        return loadVersionFile(target, value.lib, item).then(function (versionData) {
                            return (new nodes.version.VersionNode(
                                value, versionData, stateMap[value.lib][item])).saveToDb();
                        });
                    });
            });

            removed = removed.map(function (item) {
                logger.debug(util.format('remove lib: %s version: %s from db',
                    value.lib, item.value.route.conditions.version), module);
                return removeLibraryVersionNodesFromDb(target, value.lib, item);
            });

            return vow.all(added.concat(modified).concat(removed));
        });
}

module.exports = function (target) {
    if (!target.getChanges().getNodes().areModified() && !target.getChanges().getLibraries().areModified()) {
        logger.warn('No changes were made during this synchronization. This step will be skipped', module);
        return vow.resolve(target);
    }

    return getLibraryNodesFromDb(target)
        .then(function (records) {
            return vow.all(records.map(function (record) {
                return syncLibraryVersions(target, record);
            }));
        })
        .then(function () {
            logger.info('Libraries were synchronized  successfully with database', module);
            return vow.resolve(target);
        })
        .fail(function (err) {
            logger.error(
                util.format('Libraries synchronization with database failed with error %s', err.message), module);
            return vow.reject(err);
        });
};
