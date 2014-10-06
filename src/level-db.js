'use strict';

var util = require('util'),
    path = require('path'),

    _ = require('lodash'),
    levelup = require('levelup'),
    vow = require('vow'),

    logger = require('./logger'),

    DB_NAME = 'leveldb',
    db = null;

module.exports = {
    /**
     * Initialize database
     * @param {Object} options for database initialization
     */
    init: function() {
        logger.info('Initialize leveldb database', module);

        levelup(path.join('db', DB_NAME), function(err, _db) {
            if(err) {
                logger.error('Can not connect to leveldb database', module);
                logger.error(util.format('Error: %s', err.message), module);
            } else {
                logger.info('Database was initialized successfully', module);
                db = _db;
            }
        });
    },

    /**
     * Put value into storage by key
     * @param {String} key of record
     * @param {Object} value of record
     * @returns {*}
     */
    put: function(key, value) {
        logger.verbose(util.format('put: %s %s', key, value), module);

        if(_.isObject(value)) {
            value = JSON.stringify(value);
        }

        var def = vow.defer();
        db.put(key, value, function(err) {
            err ? def.reject(err) : def.resolve();
        });
        return def.promise();
    },

    /**
     * Returns value by key
     * @param {String} key of record
     * @returns {Object} value of record
     */
    get: function(key) {
        logger.verbose(util.format('get: %s', key), module);

        var def = vow.defer();
        db.get(key, function(err, value) {
            err ? def.reject(err) : def.resolve(JSON.parse(value));
        });
        return def.promise();
    },

    /**
     * Removes value by key
     * @param {String} key of record
     * @returns {*}
     */
    del: function(key) {
        logger.verbose(util.format('del: %s', key), module);

        var def = vow.defer();
        db.del(key, function(err) {
            err ? def.reject(err) : def.resolve();
        });
        return def.promise();
    },

    batch: function(operations) {
        if(!operations.length) {
            return vow.resolve();
        }

        var def = vow.defer();
        db.batch(operations, function(err) {
            err ? def.reject(err) : def.resolve();
        });
        return def.promise();
    },

    /**
     * Returns true if database is in open state
     * @returns {*|boolean}
     */
    isOpen: function() {
        return db.isOpen();
    },

    /**
     * Returns true if database is in closed state
     * @returns {*|boolean}
     */
    isClosed: function() {
        return db.isClosed();
    },

    /**
     * Returns data by criteria
     * @param {Function} criteria function
     * @param {Object} config object for set type of data that should be returned
     * @returns {*}
     */
    getByCriteria: function(criteria, config) {
        var def = vow.defer(),
            result = [];
        db.createReadStream(config || { keys: true, values: true })
            .on('data', function (data) {
                if(criteria(data)) {
                    result.push(data);
                }
            })
            .on('error', function (err) {
                def.reject(err);
            })
            .on('close', function () {
                def.resolve(result);
            })
            .on('end', function () {
                def.resolve(result);
            });
        return def.promise();
    },

    /**
     * Returns array of keys by criteria
     * @param {Function} criteria function
     * @returns {*}
     */
    getKeysByCriteria: function(criteria) {
        return this.getByCriteria(criteria, { keys: true, values: false });
    },

    /**
     * Returns array of values by criteria
     * @param {Function} criteria function
     * @returns {*}
     */
    getValuesByCriteria: function(criteria) {
        return this.getByCriteria(criteria, { keys: false, values: true });
    },

    removeByKeyPrefix: function(prefix) {
        logger.verbose(util.format('Remove existed data for prefix %s', prefix), module);

        return this.getKeysByCriteria(function (key) {
            return key.indexOf(prefix) > -1;
        })
            .then(function (keys) {
                return this.batch(keys.map(function (key) {
                    return { type: 'del', key: key };
                }));
            }, this);
    },

    getDb: function() {
        return db;
    }
};
