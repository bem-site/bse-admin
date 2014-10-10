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

function checkForNewModel(target) {
    return vowFs.exists(target.MODEL_FILE_PATH)
        .then(function(exists) {
            return exists ? vow.resolve() : (function() {
                var message = 'There no updated model file. This step will be skipped';
                logger.warn(message, module);
                return vow.reject(message);
            })();
        })
        .then(function() {
            return vowFs.isFile(target.MODEL_FILE_PATH);
        })
        .then(function(isFile) {
            return isFile ? vow.resolve() : (function() {
                var message = 'Model file is not file. This step will be skipped';
                logger.warn(message, module);
                return vow.reject(message);
            })();
        });
}

function loadNewModel(target) {
    logger.warn('Updated model was found. Start to load and parse it', module);

    return vowFs.read(target.MODEL_FILE_PATH, 'utf-8').then(function(content) {
        try {
            return JSON.parse(content);
        } catch (err) {
            var error = 'Error while parsing model';
            logger.error(error, module);
            return vow.reject(error);
        }
    });
}

/**
 * Remove old nodes data
 * @returns {*}
 */
function removeOldNodesData(target) {
    return levelDb.getKeysByCriteria(function(key) {
            return key.indexOf(target.KEY.NODE_PREFIX) > -1;
        })
        .then(function(keys) {
            return levelDb.batch(keys.map(function(key) {
                return { type: 'del', key: key };
            }));
        });
}

/**
 * Remove old docs data
 * @returns {*}
 */
function removeOldDocsData(target) {
    return levelDb.getKeysByCriteria(function(key) {
            return key.indexOf(target.KEY.DOCS_PREFIX) > -1;
        })
        .then(function(keys) {
            return levelDb.batch(keys.map(function(key) {
                return { type: 'del', key: key };
            }));
        });
}

/**
 * Analyze meta information for node
 * @param collected - {Object} hash of collected data
 * @param node - {BaseNode} node
 * @returns {Object} collected
 */
function analyzeMeta(collected, node) {
    if(!_.isObject(node.source)) {
        return collected;
    }

    var source = node.source,
        hasContent = Object.keys(source).some(function (lang) {
            return source[lang] && source[lang].content;
        });

    !hasContent && (node.hidden = true);

    utility.getLanguages().forEach(function (lang) {
        if (!source[lang]) {
            logger.warn(util.format('source with lang %s does not exists for node with url %s', lang, node.url), module);
            source[lang] = null;
            return;
        }

        source[lang] = new Meta(source[lang], lang, collected);
    });
    node.source = source;
    return collected;
}

function separateSource(target, nodes) {
    var nodeItems = nodes.getAll(),
        nodeItemsWithSource = nodeItems.filter(function(item) {
            return item.source;
        }),
        collected = nodeItemsWithSource.reduce(function(prev, item) {
                return analyzeMeta(prev, item);
            }, {
                authors: [],
                translators: [],
                tags: {}
            });
        return vow.all([
                levelDb.put('authors', collected.authors),
                levelDb.put('translators', collected.translators),
                levelDb.put('tags', collected.tags)
            ])
            .then(function() {
                return removeOldDocsData(target);
            })
            .then(function() {
                var batchActions = [];

                nodeItemsWithSource.forEach(function(node) {
                    utility.getLanguages().forEach(function(lang) {
                        if(node.source[lang]) {
                            batchActions.push({
                                type: 'put',
                                key: util.format('%s%s:%s', target.KEY.DOCS_PREFIX, node.id, lang),
                                value: node.source[lang]
                            });
                        }
                    });
                });

                nodes.removeSources();
                return batchActions.length ? levelDb.batch(batchActions) : vow.resolve();
            });
}

function processNewModel(target, content) {
    var nodes;
    try {
        nodes = new Nodes(content);
    } catch (err) {
        return vow.reject(err);
    }

    return separateSource(target, nodes)
        .then(function() {
            return removeOldNodesData(target);
        })
        .then(function() {
            return levelDb.batch(nodes.getAll().map(function(node) {
                var key = util.format('%s%s:%s', target.KEY.NODE_PREFIX, node.id, node.parent);
                return { type: 'put', key: key, value: node };
            }));
        });
}

module.exports = function(target) {
    logger.info('Check if model data was changed start', module);
    return checkForNewModel(target)
        .then(function() {
            return loadNewModel(target);
        })
        .then(function(content) {
            return processNewModel(target, content);
        })
        .then(function() {
            logger.info('Nodes were synchronized  successfully', module);
            return vow.resolve(target);
        })
        .fail(function(err) {
            logger.error(err, module);
            return vow.reject(err);
        });
};
