'use strict';

var util = require('util'),
    vow = require('vow'),

    levelDb = require('../level-db'),
    logger = require('../logger');

module.exports = function (target) {
    var keysForRemove = target.getOptions().keys || [];
    return levelDb.getKeysByCriteria(function (key) {
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
            return levelDb.batch(operations);
        })
        .then(function () {
            logger.info(util.format('Database has been cleared successfully'), module);
            return vow.resolve(target);
        })
        .fail(function (err) {
            logger.error(util.format('Database clear failed with error', err.message), module);
            return vow.reject(err);
        });
};
