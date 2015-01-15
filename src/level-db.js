'use strict';

var util = require('util'),
    path = require('path'),

    levelup = require('level'),
    _ = require('lodash'),
    vow = require('vow'),
    vowFs = require('vow-fs'),

    errors = require('./errors').LevelDB,
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
                    errors.createError(errors.INIT, { err: err }).log();
                    def.reject(err);
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
            if (err) {
                errors.createError(errors.PUT, { key: key, err: err }).log();
                def.reject(err);
            } else {
                def.resolve();
            }
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
                    def.resolve();
                } else {
                    errors.createError(errors.GET, { key: key, err: err }).log();
                    def.reject();
                }
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
            if (err) {
                errors.createError(errors.DEL, { key: key, err: err }).log();
                def.reject(err);
            } else {
                def.resolve();
            }
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
            if (err) {
                errors.createError(errors.BATCH, { err: err }).log();
                def.reject(err);
            } else {
                def.resolve();
            }
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
                errors.createError(errors.GET_BY_CRITERIA, { err: err }).log();
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
     * @param {Object} options - advanced options
     * @returns {*}
     */
    getKeysByCriteria: function (criteria, options) {
        return this._getByCriteria(criteria, _.extend({ keys: true, values: false }, options || {}));
    },

    /**
     * Returns array of values by criteria
     * @param {Function} criteria function
     * @param {Object} options - advanced options
     * @returns {*}
     */
    getValuesByCriteria: function (criteria, options) {
        return this._getByCriteria(criteria, _.extend({ keys: false, values: true }, options || {}));
    },

    /**
     * Returns records that satisfied given criteria function
     * @param {Function} criteria function
     * @param {Object} options - advanced options
     * @returns {*}
     */
    getByCriteria: function (criteria, options) {
        return this._getByCriteria(criteria, _.extend({ keys: true, values: true }, options || {}));
    },

    /**
     * Removes records that satisfied given criteria function
     * @param {Function} criteria function
     * @param {Object} options - advanced options
     * @returns {*}
     */
    removeByCriteria: function (criteria, options) {
        return this.getByCriteria(criteria, options).then(function (records) {
            return this.batch(records.map(function (record) {
                return { type: 'del', key: record.key };
            }));
        }, this);
    },

    /**
     * Returns all records that keys contains given prefix
     * @param {String} prefixFrom - start prefix of keys
     * @param {String} prefixTo - end prefix of keys
     * @returns {*}
     */
    getByKeyRange: function (prefixFrom, prefixTo) {
        var options = { fillCache: true };

        if (prefixFrom) {
            options.gte = prefixFrom;
        }

        if (prefixTo) {
            options.lt = prefixTo;
        }

        return this.getByCriteria(function () {
            return true;
        }, options);
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
