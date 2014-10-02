var util = require('util'),
    path = require('path'),

    _ = require('lodash'),
    Db = require('levelup'),
    vow = require('vow'),

    logger = require('../logger');

var LevelDBProvider = function() {
    this.init();
};

LevelDBProvider.prototype = {
    DB_NAME: 'leveldb',
    db: null,

    /**
     * Initialize database
     * @param {Object} options for database initialization
     */
    init: function() {
        logger.info('Initialize leveldb database', module);

        var _this = this;
        Db(path.join('db', this.DB_NAME), function(err, db) {
            if(err) {
                logger.error('Can not connect to leveldb database', module);
                logger.error(util.format('Error: %s', err.message), module);
            } else {
                logger.info('Database was inialized successfully', module);
                _this.db = db;
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
        logger.debug(util.format('put: %s %s', key, value), module);

        if(_.isObject(value)) {
            value = JSON.stringify(value);
        }

        var def = vow.defer();
        this.db.put(key, value, function(err) {
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
        logger.debug(util.format('get: %s', key), module);

        var def = vow.defer();
        this.db.get(key, function(err, value) {
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
        logger.debug(util.format('del: %s', key), module);

        var def = vow.defer();
        this.db.del(key, function(err) {
            err ? def.reject(err) : def.resolve();
        });
        return def.promise();
    },

    batch: function(operations) {
        if(!operations.length) {
            return vow.resolve();
        }

        var def = vow.defer();
        this.db.batch(operations, function(err) {
            err ? def.reject(err) : def.resolve();
        });
        return def.promise();
    },

    /**
     * Returns true if database is in open state
     * @returns {*|boolean}
     */
    isOpen: function() {
        return this.db.isOpen();
    },

    /**
     * Returns true if database is in closed state
     * @returns {*|boolean}
     */
    isClosed: function() {
        return this.db.isClosed();
    },

    /**
     * Returns array of keys by criteria
     * @param {Function} criteria function
     * @returns {*}
     */
    getKeysByCriteria: function(criteria) {
        var def = vow.defer(),
            result = [];
        this.db.createReadStream({ keys: true, values: false })
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

    getDb: function() {
        return this.db;
    }
};

exports.LevelDBProvider = LevelDBProvider;
