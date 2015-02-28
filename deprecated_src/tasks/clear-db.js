'use strict';

var util = require('util'),
    vow = require('vow'),

    levelDb = require('../providers/level-db'),
    errors = require('../errors').TaskClearDB,
    logger = require('../logger');

module.exports = function (target) {
    var keysForRemove = target.getOptions().keys || [];
    return levelDb.get().getKeysByCriteria(function (key) {
            if (!keysForRemove.length) {
                return true;
            }
            return keysForRemove.filter(function (kfr) {
                return key.indexOf(kfr) > -1;
            }).length;
        })
        .then(function (keys) {
            return keys.map(function (key) {
                return { type: 'del', key: key };
            });
        })
        .then(function (operations) {
            return levelDb.get().batch(operations);
        })
        .then(function () {
            logger.info(util.format('Database has been cleared successfully'), module);
            return vow.resolve(target);
        })
        .fail(function (err) {
            errors.createError(errors.CODES.COMMON, { err: err }).log();
            return vow.reject(err);
        });
};
