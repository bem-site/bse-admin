'use strict';

var util = require('util'),
    path = require('path'),

    _ = require('lodash'),
    vow = require('vow'),
    vowFs = require('vow-fs'),
    fsExtra = require('fs-extra'),
    semver = require('semver'),

    errors = require('../errors').TaskLibrariesDb,
    logger = require('../logger'),
    utility = require('../util'),
    levelDb = require('../providers/level-db'),
    nodes = require('../model/nodes/index.js');

module.exports = {
    /**
     * Returns db hint object for improve db calls
     * @param {TargetNodes} target object
     * @returns {{gte: (TargetBase.KEY.NODE_PREFIX|*), lt: (TargetBase.KEY.PEOPLE_PREFIX|*), fillCache: boolean}}
     */
    _getDbHints: function (target) {
        return { gte: target.KEY.NODE_PREFIX, lt: target.KEY.PEOPLE_PREFIX, fillCache: true };
    },

    /**
     * Returns array of library nodes from database
     * @param {TargetBase} target object
     * @returns {*}
     */
    _getRootLibNodes: function (target) {
        return levelDb
            .get().getByCriteria(function (record) {
                // criteria - is existed field lib
                return record.value.lib;
            }, this._getDbHints(target));
    },

    /**
     * Returns array of library version nodes from database
     * @param {TargetNodes} target object
     * @param {Object} lib - database record of library node
     * @returns {*}
     */
    _getLibVersionNodes: function (target, lib) {
        return levelDb.get().getByCriteria(function (record) {
            var key = record.key,
                value = record.value;

            if (key.indexOf(target.KEY.NODE_PREFIX) < 0) {
                return false;
            }

            // criteria is equality of parent and id fields of version and library nodes
            return value.parent === lib.id;
        }, this.getDbHints(target));
    },

    _removeLibVersionsFromDb: function (target, libVersions) {
        libVersions = libVersions.reduce(function (prev, item) {
            prev[item.lib] = prev[item.lib] || [];
            prev[item.lib].push(item.version);
        }, {});

        return levelDb.get().removeByCriteria(function (dbRecord) {
            var value = dbRecord.value,
                route,
                conditions;

            route = value.route;
            if (!route) {
                return false;
            }

            conditions = route.conditions;
            if (!conditions) {
                return false;
            }

            if(value.lib) {
                return false;
            }

            if (libVersions[conditions.lib] &&
                libVersions[conditions.lib].indexOf(conditions.version) > -1) {
                logger.debug(
                    util.format('rm from db lib: => %s version: => %s', conditions.lib, conditions.version), module);
                return true;
            }

            return false;
        }, this._getDbHints(target));
    },

    /**
     * Loads data.json file from libraries cache {cache}/{lib}/{version}/data.json
     * @param {TargetLibraries} target object
     * @param {String} lib - library name
     * @param {String} version - library version name
     * @returns {*}
     */
    _loadVersionFile: function (target, lib, version) {
        return vowFs.read(path.join(target.LIBRARIES_FILE_PATH, lib, version, 'data.json'), 'utf-8')
            .then(function (content) {
                try {
                    return JSON.parse(content);
                } catch (err) {
                    return null;
                }
            });
    },

    _addLibVersionToDb: function(target, lib, version, rootRecord) {
        logger.debug(util.format('add lib: => %s version: => %s to database', lib, version), module);

        if(!rootRecord) {
            logger.warn(util.format('Root db record for lib: => %s was not found. Skip', lib), module);
            return vow.resolve();
        }

        return this._loadVersionFile(target, lib, version)
            .then(function (versionData) {
                if(!versionData) {
                    logger.warn(util.format('version data is null for %s %s', value.lib, item), module);
                    return vow.resolve();
                }

                return (new nodes.version.VersionNode(rootRecord, versionData)).saveToDb();
            });
    },

    _addLibVersionsToDb: function (target, libVersions) {
        return this._getRootLibNodes(target)
            .then(function (records) {
                return records.reduce(function (prev, item) {
                    prev[item.value.lib] = item.value;
                    return prev;
                }, {})
            })
            .then(function (libsRootsMap) {
                return libVersions.reduce(function (prev, item) {
                    return prev.then(function () {
                        return this._addLibVersionToDb(target, item.lib, item.version, libsRootsMap[item.lib]);
                    }, this);
                }.bind(this), vow.resolve());
            }, this);
    },

    _compareVersions: function(a, b) {
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
    },

    /**
     * Method for sorting library versions in correct order
     * @param {TargetLibraries} target object
     * @returns {*}
     */
     _sortLibraryVersions: function(target) {
        return this._getRootLibNodes(target).then(function (records) {
            return vow.all(records.map(function (record) {
                var value = record.value;
                return this._getLibVersionNodes(target, value)
                    .then(function (records) {
                        return levelDb.get().batch(records
                            .sort(function (a, b) {
                                a = a.value.route.conditions.version;
                                b = b.value.route.conditions.version;
                                return this._compareVersions(a, b);
                            }.bind(this))
                            .map(function (record, index) {
                                record.value.current = index === 0;
                                record.value.order = index;
                                return { type: 'put', key: record.key, value: record.value };
                            })
                        );
                    }, this);
            }, this));
        }, this);
    },

    run: function (target) {
        var libChanges = target.getChanges().getLibraries(),
            addLibVersions = [],
            removeLibVersions = [];

        if(!target.getChanges().wasModelChanged()) {
            addLibVersions = addLibVersions
                .concat(libChanges.getAdded())
                .concat(libChanges.getModified());
            removeLibVersions = removeLibVersions
                .concat(libChanges.getRemoved())
                .concat(libChanges.getModified())
        } else {
            var registry = fsExtra.readJSONFileSync(path.join(target.LIBRARIES_FILE_PATH, 'registry.json'));
            addLibVersions = (function (registry) {
                var result = [];
                Object.keys(registry).forEach(function (lib) {
                    if(!registry[lib] || !registry[lib].versions) {
                        return;
                    }

                    Object.keys(registry[lib].versions).forEach(function (version) {
                       result.push({ lib: lib, version: version });
                    });
                });
                return result;
            })(registry);
        }

        return vow.when(true)
            .then(function () {
                return this._removeLibVersionsFromDb(target, removeLibVersions);
            }, this)
            .then(function () {
                return this._addLibVersionsToDb(target, addLibVersions);
            }, this)
            .then(function () {
                return this._sortLibraryVersions(target);
            }, this)
            .then(function () {
                logger.info('Libraries were synchronized  successfully with database', module);
                return vow.resolve(target);
            }, this)
            .fail(function (err) {
                logger.error('Error occur: ' + err.message, module);
                return vow.reject(err);
            });
    }
};
