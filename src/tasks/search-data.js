'use strict';

var path = require('path'),
    vow = require('vow'),
    vowFs = require('vow-fs'),

    errors = require('../errors').TaskSearchData,
    levelDb = require('../level-db'),
    logger = require('../logger'),
    utility = require('../util'),
    nodes = require('../model/nodes/index.js');

/**
 * Returns database hints for increase db data retrieve
 * @param {TargetNodes} target object
 * @returns {{gte: (TargetBase.KEY.NODE_PREFIX|*), lt: (TargetBase.KEY.PEOPLE_PREFIX|*), fillCache: boolean}}
 */
function getDbHints(target) {
    return { gte: target.KEY.NODE_PREFIX, lt: target.KEY.PEOPLE_PREFIX, fillCache: true };
}

/**
 * Returns library node values from db
 * @returns {*}
 */
function getLibraries(target) {
    return levelDb.getValuesByCriteria(function (value) {
        return value.lib;
    }, getDbHints(target));
}

/**
 * Returns library version node values from db
 * @returns {*}
 */
function getVersions(target) {
    return levelDb.getValuesByCriteria(function (value) {
        return value.class === 'version';
    }, getDbHints(target));
}

/**
 * Returns library level node values from db
 * @returns {*}
 */
function getLevels(target) {
    return levelDb.getValuesByCriteria(function (value) {
        return value.class === 'level';
    }, getDbHints(target));
}

/**
 * Returns library block node values from db
 * @returns {*}
 */
function getBlocks(target) {
    return levelDb.getValuesByCriteria(function (value) {
        return value.class === 'block';
    }, getDbHints(target));
}

/**
 * Returns version nodes for given library
 * @param {Object} libValue - library record value
 * @param {Array} versionValues - library version record values
 * @returns {*}
 */
function getVersionsOfLibrary(libValue, versionValues) {
    return versionValues.filter(function (item) {
        return item.route.conditions.lib === libValue.route.conditions.lib;
    });
}

/**
 * Returns block levels for given library version
 * @param {Object} versionValue - library version record value
 * @param {Array} levelValues - block levels record values
 * @returns {*}
 */
function getLevelsOfLibraryVersion(versionValue, levelValues) {
    return levelValues.filter(function (item) {
        var iConditions = item.route.conditions,
            lvConditions = versionValue.route.conditions;
        return iConditions.lib === lvConditions.lib && iConditions.version === lvConditions.version;
    });
}

/**
 * Returns blocks for given blocks level
 * @param {Object} levelValue - block level record value
 * @param {Array} blockValues - blocks record values
 * @returns {*}
 */
function getBlocksOfLibraryVersionLevel(levelValue, blockValues) {
    return blockValues.filter(function (item) {
        var iConditions = item.route.conditions,
            lvConditions = levelValue.route.conditions;
        return iConditions.lib === lvConditions.lib &&
            iConditions.version === lvConditions.version &&
            iConditions.level === lvConditions.level;
    });
}

function loadDataForLibraries(libraries) {
    return libraries;
}

/**
 * Retrieves block inner data
 * @param {Array} blocks array
 * @returns {*}
 */
function loadDataForBlocks(blocks) {
    return vow.all(blocks.map(function (item) {
        var setLoadedData = levelDb.get(item.data)
                .then(function (data) {
                    item.processData(data);
                    return item;
                }),
            setLoadedJsDoc = levelDb.get(item.jsdoc)
                .then(function (jsdoc) {
                    item.jsdoc = jsdoc;
                    return item;
                });
        return vow.all([ setLoadedData, setLoadedJsDoc ])
            .then(function () {
                return item;
            });
    }));
}

/**
 * Save collected search data objects to *.json files
 * @param {TargetNodes} target object
 * @param {String} fileName - name of file for data save
 * @param {Object} data for search engines
 * @returns {*}
 */
function saveToFile(target, fileName, data) {
    var p = path.join(target.CACHE_DIR, 'search', fileName);
    return vowFs.write(p, JSON.stringify(data));
}

/**
 * Collect and save search data
 * @param {TargetNodes} target object
 * @returns {*}
 */
function createSearchData(target) {
    return vow.all([ getLibraries(target), getVersions(target), getLevels(target), getBlocks(target) ])
        .spread(function (libV, versionV, levelV, blockV) {
            var blocks = [],
                libraries = libV.reduce(function (prev, lib, libIndex) {
                    var libName = lib.route.conditions.lib;
                    prev.push(new nodes.search.Library(libName));

                    // get library versions
                    getVersionsOfLibrary(lib, versionV).forEach(function (version, index) {
                        var versionName = version.route.conditions.version;
                        prev[libIndex]
                            .addVersion(new nodes.search.Version(versionName, version.url, '', !index));

                        // get library version levels
                        getLevelsOfLibraryVersion(version, levelV).forEach(function (level) {
                            var levelName = level.route.conditions.level;
                            prev[libIndex]
                                .getVersion(versionName)
                                .addLevel(new nodes.search.Level(levelName));

                            // get library version level blocks
                            getBlocksOfLibraryVersionLevel(level, blockV).forEach(function (block) {
                                var blockName = block.route.conditions.block;
                                prev[libIndex]
                                    .getVersion(versionName)
                                    .getLevel(levelName)
                                    .addBlock(blockName);

                                blocks.push(
                                    new nodes.search.Block(blockName, block.url, libName,
                                        versionName, levelName, block.source.data, block.source.jsdoc));
                            });
                        });
                    });
                    return prev;
                }, []);

            return vow.all([libraries, blocks]);
        })
        .spread(function (libraries, blocks) {
            return vow.all([loadDataForLibraries(libraries), loadDataForBlocks(blocks)]);
        })
        .spread(function (libraries, blocks) {
            var searchDirParh = path.join(target.CACHE_DIR, 'search');
            return utility
                .removeDir(searchDirParh)
                .then(function () {
                    return vowFs.makeDir(searchDirParh);
                })
                .then(function () {
                    return vow.all([
                        saveToFile(target, 'libraries.json', libraries),
                        saveToFile(target, 'blocks.json', blocks)
                    ]);
                });
        });
}

module.exports = function (target) {
    logger.info('Start preparing data for search engine', module);

    if (!target.getChanges().areModified()) {
        logger.warn('No changes were made during this synchronization. This step will be skipped', module);
        return vow.resolve(target);
    }

    return createSearchData(target)
        .then(function () {
            logger.info('Preparing data for search engine was finished successfully', module);
            return vow.resolve(target);
        })
        .fail(function (err) {
            errors.createError(errors.CODES.COMMON, { err: err }).log();
            return vow.reject(err);
        });
};
