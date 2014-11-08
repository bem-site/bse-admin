var util = require('util'),

    vow = require('vow'),

    errors = require('../errors').TaskDynamicTags,
    logger = require('../logger'),
    levelDb = require('../level-db'),
    nodes = require('../model/nodes/index.js');

/**
 * Removes existed tag nodes from database
 * @param {TargetBase} target object
 * @param {String} key - dynamic key for tags parent node
 * @returns {*}
 */
function removeTagNodes(target, key) {
    return levelDb
        .getByCriteria(function (record) {
            return record.value.dynamic === key;
        })
        .then(function (dynamicRecords) {
            return vow.all(dynamicRecords.map(function (dynamicRecord) {
                return levelDb.removeByCriteria(function (record) {
                    return record.value.parent === dynamicRecord.value.id;
                });
            }));
        });
}
/**
 * Creates tag nodes and saves them into database
 * @param {TargetBase} target object
 * @param {String} key - dynamic key for tags parent node
 * @returns {*}
 */
function addTagNodes(target, key) {
    var lang = key.split(':')[1];
    return vow.all([
            levelDb.getByCriteria(function (record) {
                return record.value.dynamic === key;
            }),
            levelDb.get(target.KEY.TAGS)
        ])
        .spread(function (dynamicRecords, tags) {
            if (!dynamicRecords.length) {
                logger.warn(util.format('No records for dynamic key %s were found in db', key), module);
                return vow.resolve();
            }

            if (!tags[lang].length) {
                logger.warn(util.format('No tags were collected for lang %s', lang), module);
                return vow.resolve();
            }

            return vow.all(dynamicRecords.map(function (dynamicRecord) {
                return vow.all(tags[lang].map(function (tag) {
                    return (new nodes.tag.TagNode(dynamicRecord.value, tag)).saveToDb();
                }));
            }));
        });
}

module.exports = function (target) {
    logger.info('Start to create dynamic nodes for tags', module);

    if (!target.getChanges().getMeta().areModified()) {
        logger.warn('Meta information was not modified. This step will be skipped', module);
        return vow.resolve(target);
    }

    var tagKeys = ['tags:en', 'tags:ru'];
    return vow.all(tagKeys.map(function (key) {
            return removeTagNodes(target, key);
        }))
        .then(function () {
            return vow.all(tagKeys.map(function (key) {
                return addTagNodes(target, key);
            }));
        })
        .then(function () {
            logger.info('Successfully create dynamic nodes for tags', module);
            return vow.resolve(target);
        })
        .fail(function (err) {
            errors.createError(errors.CODES.COMMON, { err: err }).log();
            return vow.reject(err);
        });
};
