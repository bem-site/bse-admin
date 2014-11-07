'use strict';

var util = require('util'),
    path = require('path'),

    levelup = require('levelup'),
    _ = require('lodash'),
    vow = require('vow'),
    vowFs = require('vow-fs'),

    utility = require('./util'),
    logger = require('./logger'),

    DB_NAME = 'leveldb',
    DB_OPTIONS = {
        keyEncoding: 'utf-8',
        valueEncoding: {
            encode: JSON.stringify,
            decode: function (val) {
                try {
                    return JSON.parse(val);
                } catch (err) {
                    return val;
                }
            },
            buffer: false,
            type: 'custom'
        }
    },

    db = null,
    isInitialized = false;

module.exports = {
    /**
     * Initialize database
     */
    init: function () {
        var def = vow.defer();

        if (isInitialized) {
            return vow.resolve();
        }

        logger.info('Initialize leveldb database', module);
        return vowFs
            .makeDir(path.join(process.cwd(), 'db'))
            .then(function () {
                try {
                    db = levelup(path.join('db', DB_NAME));
                    logger.info('Database was initialized successfully', module);
                    isInitialized = true;
                    def.resolve();
                } catch (err) {
                    var message = util.format('Can not connect to leveldb database. Error: %s', err.message);
                    logger.error(message, module);
                    def.reject(message);
                }
                return def.promise();
            });
    },

    /**
     * Put value into storage by key
     * @param {String} key of record
     * @param {Object} value of record
     * @returns {*}
     */
    put: function (key, value) {
        logger.verbose(util.format('put: %s %s', key, value), module);

        var def = vow.defer();
        db.put(key, value, DB_OPTIONS, function (err) {
            err ? def.reject(err) : def.resolve();
        });
        return def.promise();
    },

    /**
     * Returns value by key
     * @param {String} key of record
     * @returns {Object} value of record
     */
    get: function (key) {
        logger.verbose(util.format('get: %s', key), module);

        var def = vow.defer();
        db.get(key, DB_OPTIONS, function (err, value) {
            if (err) {
                if (err.type === 'NotFoundError') {
                    return def.resolve();
                }
                def.reject();
            }
            def.resolve(value);
        });
        return def.promise();
    },

    /**
     * Removes value by key
     * @param {String} key of record
     * @returns {*}
     */
    del: function (key) {
        logger.verbose(util.format('del: %s', key), module);

        var def = vow.defer();
        db.del(key, function (err) {
            err ? def.reject(err) : def.resolve();
        });
        return def.promise();
    },

    /**
     * Performs batch operations in database
     * @param {Array} operations - array of operations that should be performed in batch mode
     * @returns {*}
     */
    batch: function (operations) {
        if (!operations.length) {
            return vow.resolve();
        }

        var def = vow.defer();
        db.batch(operations, DB_OPTIONS, function (err) {
            err ? def.reject(err) : def.resolve();
        });
        return def.promise();
    },

    /**
     * Returns data by criteria
     * @param {Function} criteria function
     * @param {Object} config object for set type of data that should be returned
     * @returns {*}
     */
    _getByCriteria: function (criteria, config) {
        var def = vow.defer(),
            result = [];
        db.createReadStream(_.extend(DB_OPTIONS, config))
            .on('data', function (data) {
                if (criteria(data)) {
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
    getKeysByCriteria: function (criteria) {
        return this._getByCriteria(criteria, { keys: true, values: false });
    },

    /**
     * Returns array of values by criteria
     * @param {Function} criteria function
     * @returns {*}
     */
    getValuesByCriteria: function (criteria) {
        return this._getByCriteria(criteria, { keys: false, values: true });
    },

    /**
     * Returns records that satisfied given criteria function
     * @param {Function} criteria function
     * @returns {*}
     */
    getByCriteria: function (criteria) {
        return this._getByCriteria(criteria, { keys: true, values: true });
    },

    /**
     * Removes records that satisfied given criteria function
     * @param {Function} criteria function
     * @returns {*}
     */
    removeByCriteria: function (criteria) {
        return this.getByCriteria(criteria).then(function (records) {
            return this.batch(records.map(function (record) {
                return { type: 'del', key: record.key };
            }));
        }, this);
    },

    /**
     * Returns all records that keys contains given prefix
     * @param {String} prefix of keys
     * @returns {*}
     */
    getByKeyPrefix: function (prefix) {
        return this.getByCriteria(function (record) {
            return record.key.indexOf(prefix) > -1;
        });
    },

    /**
     * Removes all records that keys contains given prefix
     * @param {String} prefix of keys
     * @returns {*}
     */
    removeByKeyPrefix: function (prefix) {
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

    /**
     * Copy all db files to another folder
     * @param {String} snapshotPath - path to shapshot folder
     * @returns {*}
     */
    copy: function (snapshotPath) {
        return utility.copyDir(path.join('db', DB_NAME), path.join(snapshotPath, DB_NAME));
    }
};
