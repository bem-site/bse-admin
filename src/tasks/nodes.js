'use strict';

var util = require('util'),

    _ = require('lodash'),
    vow = require('vow'),
    vowFs = require('vow-fs'),

    errors = require('../errors').TaskNodes,
    logger = require('../logger'),
    levelDb = require('../providers/level-db'),
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

/**
 * Saves records for meta-information
 * @param {TargetNodes} target object
 * @param {Array} nodes - array of node objects parsed from model
 * @returns {*}
 */
function saveMeta(target, nodes) {
    // get array of data.source[lang] objects
    // also add nodeId and lang fields
    return levelDb.get().batch(nodes.reduce(function (prev, node) {
            utility.getLanguages().forEach(function (lang) {
                if (node.source[lang]) {
                    node.source[lang].nodeId = node.id;
                    node.source[lang].lang = lang;
                    prev.push(node.source[lang]);
                }
            });
            return prev;
        }, [])
        .map(function (item) {
            return {
                type: 'put',
                key: util.format('%s%s:%s', target.KEY.DOCS_PREFIX, item.nodeId, item.lang),
                value: item
            };
        }));
}

/**
 * Perform analyze for meta-information
 * Collect and save info about authors, translators and tags
 * @param {TargetNodes} target object
 * @param {Nodes} nodes object
 * @returns {*}
 */
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
            levelDb.get().put(target.KEY.AUTHORS, _.uniq(collected.authors)),
            levelDb.get().put(target.KEY.TRANSLATORS, _.uniq(collected.translators)),
            levelDb.get().put(target.KEY.TAGS, collected.tags),
            saveMeta(target, nodesWithSource)
       ]);
}

/**
 * Remove all records from database
 * @returns {*}
 */
function clearDb() {
    return levelDb.get().getKeysByCriteria(function () {
            return true;
        }, undefined)
        .then(function (keys) {
            return keys.map(function (key) {
                return { type: 'del', key: key };
            });
        })
        .then(function (operations) {
            return levelDb.get().batch(operations);
        });
}

function saveNodes(target, nodes) {
    return levelDb.get().batch(nodes.getAll().map(function (item) {
        return {
            type: 'put',
            key: util.format('%s%s', target.KEY.NODE_PREFIX, item.id),
            value: item
        };
    }));
}

function processModel(target) {
    // It is normal case when file is not exist. Because it temporary
    // and should be removed after processing
    return vowFs.exists(target.MODEL_FILE_PATH).then(function (exists) {
        if (!exists) {
            logger.warn('No new model file were found. This step will be skipped', module);
            return vow.resolve(target);
        }

        var nodes;

        return vowFs
            .read(target.MODEL_FILE_PATH, 'utf-8')
            .then(function (content) {
                try {
                    nodes = new Nodes(JSON.parse(content));
                } catch (err) {
                    var error = errors.createError(errors.CODES.PARSING_MODEL, { err: err });
                    error.log();
                    return vow.reject(error);
                }
                return nodes;
            })
            .then(function (nodes) {
                return clearDb().then(function () {
                    return nodes;
                });
            })
            .then(function (nodes) {
                return separateSource(target, nodes);
            })
            .then(function () {
                nodes.removeSources();
                return saveNodes(target, nodes);
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
            errors.createError(errors.CODES.COMMON, { err: err }).log();
            return vow.reject(err);
        });
};
