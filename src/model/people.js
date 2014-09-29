'use strict';

var util = require('util'),
    path = require('path'),

    vow = require('vow'),

    logger = require('../logger'),
    config = require('../config'),
    constants = require('../constants'),
    providers = require('../providers'),

    People = function() {
        this.init();
    };

People.prototype = {

    _FILE_NAME: 'people.json',
    _people: undefined,

    /** PRIVATE METHODS **/

    /**
     * Loads data and fill the model
     * @param {Object} config with fields:
     * {Boolean} useCache - for loading data from local filesystem at first
     * @returns {promise}
     * @private
     */
    _load: function(config) {
        logger.debug(util.format('Load people module with useCache flag equal to %s', config.useCache), module);
        var promise = config.useCache ?
            this._loadFromCache() :
            this._loadFromRemote();
        return promise
            .then(this._parseContent, this)
            .then(this._saveToCache, this);
    },

    /**
     * Loads people model from local filesystem
     * @returns {promise}
     * @private
     */
    _loadFromCache: function () {
        var localFilePath = path.join(constants.DIRECTORY.MODEL, this._FILE_NAME);
        return providers.getProviderFile().exists({ path: localFilePath })
            .then(function (exists) {
                return exists ?
                    providers.getProviderFile().load({ path: localFilePath }) :
                    this._loadFromRemote();
            }, this);
    },

    _getPeopleRepositoryConfiguration: function() {
        var err,
            pr = config.get('github:people');

        if(!pr) {
            err = 'Path to people data file has not been set in application configuration';
        }

        if(!err) {
            pr = pr.match(/^https?:\/\/(.+?)\/(.+?)\/(.+?)\/(tree|blob)\/(.+?)\/(.+)/);
            if (!pr) {
                err = 'Path to repository has invalid format';
            } else {
                pr = { host: pr[1], user: pr[2], repo: pr[3], ref:  pr[5], path: pr[6] };
                pr.type = pr.host.indexOf('github.com') > -1 ? 'public' : 'private';
            }
        }

        if(err) {
            logger.warn(err, module);
            return null;
        }
        return pr;
    },

    _loadFromRemote: function () {
        logger.info('Load all people from remote repository', module);
        var pr = this._getPeopleRepositoryConfiguration();
        if(!pr) { return null; }

        return providers.getProviderGhApi().load({ repository: pr })
            .then(function(result) {
                logger.info('People successfully loaded', module);
                return (new Buffer(result.res.content, 'base64')).toString();
            })
            .fail(function(err) {
                logger.error(util.format('Error while loading people %s', err), module);
                return null;
            }, this);
    },

    /**
     * Save model from memory to file on local file system
     * @returns {promise}
     * @private
     */
    _saveToCache: function() {
        var localFilePath = path.join(constants.DIRECTORY.MODEL, this._FILE_NAME);
        return providers.getProviderFile().exists({ path: localFilePath })
            .then(function(exists) {
                return exists ?
                    providers.getProviderFile().remove({ path: localFilePath }) :
                    vow.resolve();
            }, this)
            .then(function() {
                return providers.getProviderFile().save({
                    path: localFilePath,
                    data: JSON.stringify(this._people, null, 4)
                });
            }, this);
    },

    /**
     * Parse loaded json content
     * @param {String} content - json content of people model file
     * @private
     */
    _parseContent: function (content) {
        try {
            this._people = JSON.parse(content);
        } catch (err) {
            this._people = {};
        }
        return this;
    },

    /** PUBLIC METHODS **/

    /**
     * Initialize people model from cache or remote gh data
      * @returns {promise}
     */
    init: function () {
        logger.info('Initialize people model', module);
        return this._load({ useCache: true });
    },

    /**
     * Reload model from remote gh data
     * @returns {promise}
     */
    reload: function () {
        logger.info('Reload people data', module);
        return this._load({ useCache: false });
    },

    /**
     * Returns people model
     * @returns {Object}
     */
    getPeople: function () {
        return this._people;
    },

    /**
     * Returns person from people model by it id
     * @param {String} id od person
     * @returns {Object}
     */
    getPerson: function (id) {
        return this._people[id];
    }
};

module.exports = People;
