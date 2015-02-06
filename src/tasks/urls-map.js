'use strict';

var util = require('util'),

    _ = require('lodash'),
    vow = require('vow'),

    errors = require('../errors').TaskUrlsMap,
    levelDb = require('../providers/level-db'),
    logger = require('../logger');

module.exports = function (target) {
    logger.info('Start create url - id map for router', module);

    if (!target.getChanges().areModified()) {
        logger.warn('No changes were made during this synchronization. This step will be skipped', module);
        return vow.resolve(target);
    }

    return levelDb.removeByKeyPrefix(target.KEY.URL_PREFIX)
        .then(function () {
            return levelDb.getByKeyRange(target.KEY.NODE_PREFIX, target.KEY.PEOPLE_PREFIX);
        })
        .then(function (records) {
            return records.reduce(function (prev, record) {
                var value = record.value;

                if (!value.url || !_.isString(value.url)) {
                    return prev;
                }
                prev[value.url] = record.key;
                return prev;
            }, {});
        })
        .then(function (urlIdMap) {
            return Object.keys(urlIdMap).map(function (url) {
                return { type: 'put', key: util.format('%s%s', target.KEY.URL_PREFIX, url), value: urlIdMap[url] };
            });
        })
        .then(function (operations) {
            return levelDb.batch(operations);
        })
        .then(function () {
            logger.info('Creating url - id map was finished successfully', module);
            return vow.resolve(target);
        })
        .fail(function (err) {
            errors.createError(errors.CODES.COMMON, { err: err }).log();
            return vow.reject(err);
        });
};
