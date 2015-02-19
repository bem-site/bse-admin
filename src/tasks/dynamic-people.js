var util = require('util'),

    vow = require('vow'),

    errors = require('../errors').TaskDynamicPeople,
    logger = require('../logger'),
    levelDb = require('../providers/level-db'),
    nodes = require('../model/nodes/index.js');

/**
 * Removes existed people nodes from database
 * @param {TargetBase} target object
 * @param {String} key - dynamic key for people parent node
 * @returns {*}
 */
function removePeopleNodes(target, key) {
    return levelDb.get()
        .getByCriteria(function (record) {
            return record.value.dynamic === key;
        }, { gte: target.KEY.NODE_PREFIX, lt: target.KEY.PEOPLE_PREFIX, fillCache: true })
        .then(function (dynamicRecords) {
            return vow.all(dynamicRecords.map(function (dynamicRecord) {
                return levelDb.get().removeByCriteria(function (record) {
                    return record.value.parent === dynamicRecord.value.id;
                });
            }));
        });
}
/**
 * Creates people nodes and saves them into database
 * @param {TargetBase} target object
 * @param {String} key - dynamic key for people parent node
 * @returns {*}
 */
function addPeopleNodes(target, key) {
    var dbPeopleKey = {
            authors: target.KEY.AUTHORS,
            translators: target.KEY.TRANSLATORS
        }[key];

    return vow.all([
            levelDb.get().getByCriteria(function (record) {
                return record.value.dynamic === key;
            }, { gte: target.KEY.NODE_PREFIX, lt: target.KEY.PEOPLE_PREFIX, fillCache: true }),
            levelDb.get().get(dbPeopleKey),
            levelDb.get().getByKeyRange(target.KEY.PEOPLE_PREFIX, target.KEY.TAGS)
       ])
        .spread(function (dynamicRecords, peopleKeys, peopleData) {
            peopleData = peopleData.reduce(function (prev, record) {
                prev[record.key.split(':')[1]] = record.value;
                return prev;
            }, {});

            if (!dynamicRecords.length) {
                logger.warn(util.format('No records for dynamic key %s were found in db', key), module);
                return vow.resolve();
            }

            if (!peopleKeys.length) {
                logger.warn('No people were collected', module);
                return vow.resolve();
            }

            return vow.all(dynamicRecords.map(function (dynamicRecord) {
                return vow.all(peopleKeys.map(function (person, index) {
                    var pn = new nodes.person.PersonNode(dynamicRecord.value, person, peopleData[person]);
                    pn.order = index;
                    return pn.saveToDb();
                }));
            }));
        });
}

module.exports = function (target) {
    logger.info('Start to create dynamic nodes for people', module);

    /*
    if (!target.getChanges().getMeta().areModified()) {
        logger.warn('Meta information was not modified. This step will be skipped', module);
        return vow.resolve(target);
    }
    */

    var peopleKeys = ['authors', 'translators'];
    return vow.all(peopleKeys.map(function (key) {
            return removePeopleNodes(target, key);
        }))
        .then(function () {
            return vow.all(peopleKeys.map(function (key) {
                return addPeopleNodes(target, key);
            }));
        })
        .then(function () {
            logger.info('Successfully create dynamic nodes for people', module);
            return vow.resolve(target);
        })
        .fail(function (err) {
            errors.createError(errors.CODES.COMMON, { err: err }).log();
            return vow.reject(err);
        });
};
