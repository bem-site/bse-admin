'use strict';

var util = require('util'),

    _ = require('lodash'),
    vow = require('vow'),

    levelDb = require('../level-db'),
    logger = require('../logger');

module.exports = function (target) {
    return levelDb.getKeysByCriteria(function() {
            return true;
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
