'use strict';

var util = require('util'),
    path = require('path'),

    _ = require('lodash'),
    vow = require('vow'),
    vowFs = require('vow-fs'),
    semver = require('semver'),

    errors = require('../errors').TaskLibrariesDb,
    logger = require('../logger'),
    levelDb = require('../providers/level-db'),
    nodes = require('../model/nodes/index.js');

/**
 * Returns db hint object for improve db calls
 * @param {TargetNodes} target object
 * @returns {{gte: (TargetBase.KEY.NODE_PREFIX|*), lt: (TargetBase.KEY.PEOPLE_PREFIX|*), fillCache: boolean}}
 */
function getDbHints(target) {
    return { gte: target.KEY.NODE_PREFIX, lt: target.KEY.PEOPLE_PREFIX, fillCache: true };
}

/**
 * Returns array of library nodes from database
 * @param {TargetBase} target object
 * @returns {*}
 */
function getLibraryNodesFromDb(target) {
    return levelDb
        .get().getByCriteria(function (record) {
            var key = record.key,
                value = record.value;

            if (key.indexOf(target.KEY.NODE_PREFIX) < 0) {
                return false;
            }

            // criteria - is existed field lib
            return value.lib;
        }, getDbHints(target));
}

/**
 * Returns array of library version folders for current library
 * @param {TargetNodes} target object
 * @param {Object} value - database record of library node
 * @returns {*}
 */
function getLibraryVersionsFromCache(target, value) {
    return vowFs.listDir(path.join(target.LIBRARIES_FILE_PATH, value.lib))
        .fail(function () {
            return vow.resolve([]);
        });
}

/**
 * Returns array of library version nodes from database
 * @param {TargetNodes} target object
 * @param {Object} lib - database record of library node
 * @returns {*}
 */
function getLibraryVersionNodesFromDb(target, lib) {
    return levelDb
        .get().getByCriteria(function (record) {
            var key = record.key,
                value = record.value;

            if (key.indexOf(target.KEY.NODE_PREFIX) < 0) {
                return false;
            }

            // criteria is equality of parent and id fields of version and library nodes
            return value.parent === lib.id;
        }, getDbHints(target));
}

/**
 * Collect map of contents of {lib}/{version}/_data.json files
 * @param {TargetNodes} target object
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
    return levelDb.get()
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
        }, getDbHints(target))
        .then(function (result) {
            return levelDb.get().batch(result.map(function (record) {
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

/**
 * Synchronize versions of given library between file cache and database
 * @param {TargetNodes} target object
 * @param {Object} record - library node record
 * @param {Object} stateMap current cache state
 * @returns {*}
 */
function syncLibraryVersions(target, record, stateMap) {
    var key = record.key,
        value = record.value;
    return vow.all([
            getLibraryVersionsFromCache(target, value),
            getLibraryVersionNodesFromDb(target, value)
       ])
        .spread(function (newVersions, oldVersions) {
            // hide library if there no  versions for it
            if (!newVersions.length) {
                util.getLanguages().forEach(function (lang) {
                    value.hidden[lang] = true;
                });
                return vow.all([
                    removeLibraryVersionNodesFromDb(target, value.lib),
                    levelDb.get().put(key, value)
               ]);
            }

            newVersions = newVersions.sort(function (a, b) {
                return compareVersions(a, b);
            });

            var added = [],
                modified = [],
                removed = [],
                current = newVersions[0];

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
                } else if (dbRecord.value.current && dbRecord.value.route.conditions.version !== current) {
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

            // library versions that should be added to database
            added = added.map(function (item) {
                logger.debug(util.format('add lib: %s version: %s to db', value.lib, item), module);
                target.getChanges().getLibraries().addAdded({ lib: value.lib, version: item });
                return loadVersionFile(target, value.lib, item).then(function (versionData) {
                    if(!versionData) {
                        logger.warn(util.format('version data is null for %s %s', value.lib, item), module);
                        return vow.resolve();
                    }

                    versionData.isCurrent = item === current;
                    return (new nodes.version.VersionNode(value, versionData, stateMap[value.lib][item])).saveToDb();
                });
            });

            // library versions that should be rewrited
            modified = modified.map(function (item) {
                logger.debug(util.format('modify lib: %s version: %s into db', value.lib, item), module);
                target.getChanges().getLibraries().addModified({ lib: value.lib, version: item });
                return removeLibraryVersionNodesFromDb(target, value.lib, item)
                    .then(function () {
                        return loadVersionFile(target, value.lib, item).then(function (versionData) {
                            if(!versionData) {
                                logger.warn(util.format('version data is null for %s %s', value.lib, item), module);
                                return vow.resolve();
                            }
                            versionData.isCurrent = item === current;
                            return (new nodes.version.VersionNode(
                                value, versionData, stateMap[value.lib][item])).saveToDb();
                        });
                    });
            });

            // library versions for remove from db
            removed = removed.map(function (item) {
                var _version = item.value.route.conditions.version;
                logger.debug(util.format('remove lib: %s version: %s from db',
                    value.lib, _version), module);
                target.getChanges().getLibraries().addRemoved({ lib: value.lib, version: _version });
                return removeLibraryVersionNodesFromDb(target, value.lib, _version);
            });

            return vow.all(added.concat(modified).concat(removed));
        });
}

function compareVersions(a, b) {
    var BRANCHES = ['master', 'dev'],
        VERSION_REGEXP = /^\d+\.\d+\.\d+$/;

    if (BRANCHES.indexOf(a) !== -1) { return 1; }
    if (BRANCHES.indexOf(b) !== -1) { return -1; }

    a = semver.clean(a);
    b = semver.clean(b);

    if (VERSION_REGEXP.test(a) && VERSION_REGEXP.test(b)) { return semver.rcompare(a, b); }

    if (VERSION_REGEXP.test(a)) { return -1; }
    if (VERSION_REGEXP.test(b)) { return 1; }

    if (semver.valid(a) && semver.valid(b)) { return semver.rcompare(a, b); }

    if (semver.valid(a)) { return -1; }
    if (semver.valid(b)) { return 1; }
    return a - b;
}

/**
 * Method for sorting library versions in correct order
 * @param {TargetLibraries} target object
 * @param {Object} record - library record from database
 * @returns {*}
 */
function sortLibraryVersions(target, record) {
    var value = record.value;
    return getLibraryVersionNodesFromDb(target, value)
        .then(function (records) {
            return levelDb.get().batch(records
                .sort(function (a, b) {
                    a = a.value.route.conditions.version;
                    b = b.value.route.conditions.version;
                    return compareVersions(a, b);
                })
                .map(function (record, index) {
                    record.value.current = index === 0;
                    record.value.order = index;
                    return { type: 'put', key: record.key, value: record.value };
                })
            );
        });
}

module.exports = function (target) {
    return vow.all([
            getLibraryNodesFromDb(target),
            getPreviousStateMap(target)
       ])
        .spread(function (records, stateMap) {
            return vow.all(records.map(function (record) {
                return syncLibraryVersions(target, record, stateMap)
                    .then(function () {
                        return sortLibraryVersions(target, record);
                    });
            }));
        })
        .then(function () {
            logger.info('Libraries were synchronized  successfully with database', module);
            return vow.resolve(target);
        })
        .fail(function (err) {
            errors.createError(errors.CODES.COMMON, { err: err }).log();
            return vow.reject(err);
        });
};
