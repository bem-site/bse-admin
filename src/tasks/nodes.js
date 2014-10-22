'use strict';

var util = require('util'),

    _ = require('lodash'),
    vow = require('vow'),
    vowFs = require('vow-fs'),

    logger = require('../logger'),
    levelDb = require('../level-db'),
    utility = require('../util'),
    Nodes = require('../model/nodes.js'),
    Meta = require('../model/meta');

/**
 * Analyze meta information for node
 * @param {Object} collected - hash of collected data
 * @param {BaseNode} node
 * @returns {Object} collected
 */
function analyzeMeta(collected, node) {
    if (!_.isObject(node.source)) {
        return collected;
    }

    var source = node.source,
        hasContent = Object.keys(source).some(function (lang) {
            return source[lang] && source[lang].content;
        });

    !hasContent && (node.hidden = true);

    utility.getLanguages().forEach(function (lang) {
        if (!source[lang]) {
            logger.warn(
                util.format('source with lang %s does not exists for node with url %s', lang, node.url), module);
            source[lang] = null;
            return;
        }

        source[lang] = new Meta(source[lang], lang, collected);
    });
    node.source = source;
    return collected;
}

function findDifferencesForMeta(target, nodes) {
    // get array of data.source[lang] objects
    // also add nodeId and lang fields
    var newRecords = nodes.reduce(function (prev, node) {
        utility.getLanguages().forEach(function (lang) {
            if (node.source[lang]) {
                node.source[lang].nodeId = node.id;
                node.source[lang].lang = lang;
                prev.push(node.source[lang]);
            }
        });
        return prev;
    }, []);

    // get existed database records
    return levelDb.getByKeyPrefix(target.KEY.DOCS_PREFIX)
        .then(function (oldRecords) {
            var putBatchOperations = newRecords
                    .filter(function (item) {
                        // try to find corresponded database record for current item
                        var isDifferentFromDb = false,
                            dbRecord = _.find(oldRecords, function (record) {
                                return record.key === util.format('%s%s:%s',
                                        target.KEY.DOCS_PREFIX, item.nodeId, item.lang);
                            });

                        // case when record is new and not presented in yet
                        if (!dbRecord) {
                            target.getChanges().getMeta().addAdded({ title: item.title, url: item.content });
                            return true;
                        }

                        // case when record was modified (meta information was changed manually)
                        isDifferentFromDb = item.isDifferentFromDb(dbRecord);
                        if (isDifferentFromDb) {
                            target.getChanges().getMeta().addModified({
                                title: item.title,
                                url: item.url || item.content
                            });
                            return true;
                        }

                        return false;
                    })
                    .map(function (item) {
                        return {
                            type: 'put',
                            key: util.format('%s%s:%s', target.KEY.DOCS_PREFIX, item.nodeId, item.lang),
                            value: item
                        };
                    }),

                // try to find database records that already were excluded from new records set
                // create set of batch operations for remove records from database
                delBatchOperations = oldRecords
                    .filter(function (record) {
                        var newRecord = _.find(newRecords, function (item) {
                            return record.key === util.format('%s%s:%s',
                                    target.KEY.DOCS_PREFIX, item.nodeId, item.lang);
                        });

                        if (!newRecord) {
                            var v = record.value;
                            target.getChanges().getMeta().addRemoved({ title: v.title, url: v.url || v.content });
                            return true;
                        }

                        return false;
                    })
                    .map(function (record) {
                        return {
                            type: 'del',
                            key: record.key
                        };
                    });
            return vow.all([
                levelDb.batch(putBatchOperations),
                levelDb.batch(delBatchOperations)
            ]);
        });
}

function separateSource(target, nodes) {
    var nodesWithSource = nodes.getAll().filter(function (item) {
            return item.source;
        }),
        collected = nodesWithSource.reduce(function (prev, item) {
                return analyzeMeta(prev, item);
            }, {
                authors: [],
                translators: [],
                tags: {}
            });
        return vow.all([
            levelDb.put(target.KEY.AUTHORS, _.uniq(collected.authors)),
            levelDb.put(target.KEY.TRANSLATORS, _.uniq(collected.translators)),
            levelDb.put(target.KEY.TAGS, _.uniq(collected.tags)),
            findDifferencesForMeta(target, nodesWithSource)
        ]);
}

function findDifferencesForNodes(target, nodes) {
    return vow.all([
            nodes.getAll(),
            levelDb.getByCriteria(function (record) {
                return record.key.indexOf(target.KEY.NODE_PREFIX) > -1 &&
                    record.value.class === 'base';
            })
        ]).spread(function (newRecords, dbRecords) {
            var putBatchOperations = newRecords
                .filter(function (item) {
                    // try to find corresponded database record for current item
                    var isDifferentFromDb,
                        dbRecord = _.find(dbRecords, function (record) {
                            return record.key === util.format('%s%s', target.KEY.NODE_PREFIX, item.id);
                        });

                    // case when record is new and not presented in yet
                    if (!dbRecord) {
                        target.getChanges().getNodes().addAdded({ title: item.title, url: item.url });
                        return true;
                    }

                    // case when record was modified (meta information was changed manually)
                    isDifferentFromDb = item.isDifferentFromDb(dbRecord);
                    if (isDifferentFromDb) {
                        target.getChanges().getNodes().addModified({
                            title: item.title,
                            url: item.url
                        });
                        return true;
                    }

                    return false;
                })
                .map(function (item) {
                    return {
                        type: 'put',
                        key: util.format('%s%s', target.KEY.NODE_PREFIX, item.id),
                        value: item
                    };
                }),
                delBatchOperations = dbRecords
                    .filter(function (record) {
                        var newRecord = _.find(newRecords, function (item) {
                            return record.key === util.format('%s%s', target.KEY.NODE_PREFIX, item.id);
                        });

                        if (!newRecord) {
                            var v = record.value;
                            target.getChanges().getNodes().addRemoved({ title: v.title, url: v.url });
                            return true;
                        }

                        return false;
                    })
                    .map(function (record) {
                        return {
                            type: 'del',
                            key: record.key
                        };
                    });
            return vow.all([
                levelDb.batch(putBatchOperations),
                levelDb.batch(delBatchOperations)
            ]);
        });
}

function processModel(target) {
    // It is normal case when file is not exist. Because it temporary
    // and should be removed after processing
    return vowFs.exists(target.MODEL_FILE_PATH).then(function (exists) {
        if (!exists) {
            logger.warn('No new model file were found. This step will be skipped', module);
            return vow.resolve(target);
        }

        var nodes,
            error;

        return vowFs
            .read(target.MODEL_FILE_PATH, 'utf-8')
            .then(function (content) {
                try {
                    nodes = new Nodes(JSON.parse(content));
                } catch (err) {
                    error = 'Error while parsing or analyzing model';
                    logger.error(error, module);
                    return vow.reject(error);
                }
                return separateSource(target, nodes);
            })
            .then(function () {
                nodes.removeSources();
                return findDifferencesForNodes(target, nodes);
            });
    });
}

module.exports = function (target) {
    logger.info('Check if model data was changed start', module);
    return processModel(target)
        .then(function () {
            logger.info('Nodes were synchronized  successfully', module);
            return vow.resolve(target);
        })
        .fail(function (err) {
            logger.error(err, module);
            return vow.reject(err);
        });
};
