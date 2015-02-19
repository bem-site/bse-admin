'use strict';

var util = require('util'),
    path = require('path'),

    levelup = require('level'),
    _ = require('lodash'),
    vow = require('vow'),
    vowFs = require('vow-fs'),
    logger = require('../logger'),
    utility = require('../util'),

    /**
     * Initialize database
     * @param {String} dbPath - database files location
     * @param {Object} dbOptions - database initialization options
     * @param {Object} options - general options
     * @returns {*}
     */
    LevelDB = function (dbPath, dbOptions, options) {
        this._dbPath = dbPath;
        this._dbOptions = dbOptions;
        this._options = options || { debug: false };
    },
    db;

LevelDB.prototype = {

    _DB_NAME: 'leveldb',

    _dbPath: undefined,
    _dbOptions: undefined,
    _options: undefined,
    _isInitialized: undefined,
    _db: undefined,

    /**
     * Creates log message in console
     * @param {String} message - log message
     * @private
     */
    _log: function (message) {
        if (this._options.debug) {
            console.log(message);
        }
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
        this._db.createReadStream(_.extend(this._dbOptions, config))
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
     * Initialize database
     * @returns {*}
     */
    init: function () {
        var def = vow.defer();
        if (this.isInitialized()) {
            return vow.resolve();
        }

        this._log('Initialize leveldb database');
        return vowFs
            .makeDir(this._dbPath)
            .then(function () {
                try {
                    this._db = levelup(path.join(this._dbPath, this._DB_NAME));
                    this._log('Database was initialized successfully');
                    this._isInitialized = true;
                    def.resolve();
                } catch (err) {
                    def.reject(err);
                }
                return def.promise();
            }, this);
    },

    isInitialized: function () {
        return !!this._isInitialized;
    },

    /**
     * Returns value by key
     * @param {String} key of record
     * @returns {Object} value of record
     */
    get: function (key) {
        var def = vow.defer();

        this._log(util.format('get: %s', key));
        this._db.get(key, this._dbOptions, function (err, value) {
            if (err) {
                if (err.type === 'NotFoundError') {
                    def.resolve();
                } else {
                    def.reject();
                }
            }
            def.resolve(value);
        });
        return def.promise();
    },

    /**
     * Put value into storage by key
     * @param {String} key of record
     * @param {Object} value of record
     * @returns {*}
     */
    put: function (key, value) {
        var def = vow.defer();

        this._log(util.format('put: %s %s', key, value));
        this._db.put(key, value, this._dbOptions, function (err) {
            err ? def.reject(err) : def.resolve();
        });
        return def.promise();
    },

    /**
     * Removes value by key
     * @param {String} key of record
     * @returns {*}
     */
    del: function (key) {
        var def = vow.defer();

        this._log(util.format('del: %s', key));
        this._db.del(key, function (err) {
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
        this._db.batch(operations, this._dbOptions, function (err) {
            err ? def.reject(err) : def.resolve();
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
        this._log(util.format('Remove existed data for prefix %s', prefix));

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
        return utility.copyDir(path.join(this._dbPath, this._DB_NAME), path.join(snapshotPath, this._DB_NAME));
    },

    /**
     * Disconnect from leveldb database
     * @returns {*}
     */
    disconnect: function () {
        var def = vow.defer();
        if (!this.isInitialized()) {
            this._log('database was not initialized yet');
            return vow.resolve();
        }

        if (!this._db.isOpen()) {
            this._log('database was already closed');
        }

        this._db.close(function (err) {
            if (err) {
                def.reject(err);
            } else {
                // this._isInitialized = false;
                def.resolve();
            }
        });
        return def.promise();
    }
};

module.exports = {
    /**
     * Initialize mds storage
     * @param {String} dbPath path to level db files
     * @returns {LevelDB}
     */
    init: function (dbPath) {
        logger.info('Initialize level-db API module', module);
        db = new LevelDB(dbPath, {
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
        }, { debug: false });
        return db.init();
    },

    /**
     * Returns media storage
     * @returns {LevelDB} media storage wrapper
     */
    get: function () {
        return db;
    }
};
