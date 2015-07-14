'use strict';

var util = require('util'),
    path = require('path'),

    _ = require('lodash'),
    vow = require('vow'),
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
     * @private
     */
    _getDbHints: function (target) {
        /*
        * Возвращает объект: {
        *   gte: 'nodes:',
        *   lt: 'people:'
        *   fillCache: true
        * }
        * Он необходим для того, чтобы выбирались только ключи имя которых "больше" nodes: и меньше "people:"
        * Это позволяет ускорить процесс такой выборки так как ключи в базе отсортированы в алфавитном порядке
        */
        return { gte: target.KEY.NODE_PREFIX, lt: target.KEY.PEOPLE_PREFIX, fillCache: true };
    },

    /**
     * Returns array of library nodes from database
     * @param {TargetBase} target object
     * @returns {Promise}
     * @private
     */
    _getRootLibNodes: function (target) {
        // возвращает записи в базе которые соответствуют корневым страницам библиотек к которым
        // привязываются все страницы версий к которым в свою очередь привязываются страницы
        // документов библиотеки, уровней переопределения и.т.д.
        // Критерий выборки - наличие поля lib (прописывается в js модели).
        // Значение поля lib - название библиотеки
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
     * @returns {Promise}
     * @private
     */
    _getLibVersionNodes: function (target, lib) {
        // В этот метод передаются значения записей в базе данных
        // которые соответствуют корневым страницам библиотек
        // По критерию выбираются дочерние узлы библиотеки, которые являются ее версиями
        return levelDb.get().getByCriteria(function (record) {
            var value = record.value;

            // criteria is equality of parent and id fields of version and library nodes
            return value.parent && value.parent === lib.id;
        }, this._getDbHints(target));
    },

    /**
     * Removes all library version records
     * @param {TargetNodes} target object
     * @param {Array} libVersions - array of objects with fields: "lib" and "version"
     * @returns {Promise}
     * @private
     */
    _removeLibVersionsFromDb: function (target, libVersions) {
        libVersions = libVersions.reduce(function (prev, item) {
            prev[item.lib] = prev[item.lib] || [];
            prev[item.lib].push(item.version);
            return prev;
        }, {});

        // Удаление всех записей из базы данных, которые относятся к определенной версии библиотеки:
        // документов библиотеки, уровней переопределения и блоков
        return levelDb.get().removeByCriteria(function (dbRecord) {
            var value = dbRecord.value,
                route,
                conditions;

            // здесь критерием является совпадение условий
            // 1. наличие у записи поля route
            // 2. наличие поля route.conditions
            // 3. наличие поля route.conditions.lib
            // 4. наличие поля route.conditions.version
            // 5. отсутствие поля lib (не удаляем корневые страницы библиотек, хотя это условие лишнее)
            // 6. наличие route.conditions.lib в списке библиотек на удаление и
            // route.conditions.version в списке версий библиоки на удаление
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

            if (!conditions.lib || !conditions.version) {
                return false;
            }

            if (libVersions[conditions.lib] &&
                libVersions[conditions.lib].indexOf(conditions.version) > -1) {
                logger.verbose(
                    util.format('rm from db lib: => %s version: => %s', conditions.lib, conditions.version), module);
                return true;
            }

            // TODO не удаляются записи документации и jsdoc по блокам из-за чего база со временем раздувается Нужно решить это в рамках отдельной задачи

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
        var libVersionFilePath = path.join(target.LIBRARIES_FILE_PATH, lib, version, 'data.json');
        return new vow.Promise(function (resolve, reject) {
            return fsExtra.readJSONFile(libVersionFilePath, function (error, content) {
                if (error || !content) {
                    logger.error(util.format('Error occur while loading file %s', libVersionFilePath), module);
                    logger.error(util.format('Error: %s', error.message), module);
                    reject(error);
                }
                resolve(content);
            });
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
            })
            .fail(function (error) {
                logger.error(util.format('Error occur on add lib: => %s version: => %s', lib, version), module);
                logger.error(util.format('Error: %s', error.message), module);
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

    /**
     * Compare library versions for sorting
     * @param {String} a - first version
     * @param {String} b - second version
     * @returns {Number} - sorting result
     * @private
     */
    _compareVersions: function(a, b) {
        var BRANCHES = ['master', 'dev'],
            VERSION_REGEXP = /^v?\d+\.\d+\.\d+$/;

        if (VERSION_REGEXP.test(a) && VERSION_REGEXP.test(b)) {
            return semver.rcompare(a, b);
        }

        if (VERSION_REGEXP.test(a)) { return -1; }
        if (VERSION_REGEXP.test(b)) { return 1; }

        if (BRANCHES.indexOf(a) > -1) { return 1; }
        if (BRANCHES.indexOf(b) > -1) { return -1; }

        if (a > b) { return -1; }
        if (a < b) { return 1; }
        return 0;
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

    /**
     * Fill addLibVersions by all library versions from MDS registry.json file
     * @returns {Array} array of objects with fields: "lib" and "version"
     * @private
     */
    _addAllFromRegistry: function () {
        var registry = fsExtra.readJSONFileSync(path.join(target.LIBRARIES_FILE_PATH, 'registry.json')),
            result = [];
        Object.keys(registry).forEach(function (lib) {
            if(!registry[lib] || !registry[lib].versions) {
                return;
            }

            Object.keys(registry[lib].versions).forEach(function (version) {
                result.push({ lib: lib, version: version });
            });
        });
        return result;
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
            addLibVersions = this._addAllFromRegistry();
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
