var util = require('util'),

    vow = require('vow'),
    logger = require('../logger'),
    levelDb = require('../level-db'),
    githubApi = require('../gh-api'),
    Changes = require('../model/changes'),

    BaseSynchronizer = function() {};

BaseSynchronizer.prototype = {
    _execute: function(changes) {
        //should be override in child classes
    },

    _createDbSnapshot: function(changes) {
        //TODO implement later
        logger.info('Create new database snapshot', module);
        return vow.resolve(changes);
    },

    executeFromCron: function(changes) {
        return this._execute(changes);
    },

    executeFromCommand: function() {
        var changes = new Changes();

        return vow.all([levelDb.init(), githubApi.init()])
            .then(function() {
                return this._execute(changes);
            }, this)
            .then(function() {
                if(changes.areModified()) {
                    return this._createDbSnapshot(changes);
                }
                return vow.resolve();
            }, this)
            .then(function() {
                var message = util.format('Synchronization was performed successfully');
                logger.info(message, module);
                return vow.resolve();
            }, this)
            .fail(function(err) {
                var message = util.format('Synchronization failed with error %s', err.message);
                logger.error(message, module);
                return vow.reject(message);
            }, this);
    }
};

exports.BaseSynchronizer = BaseSynchronizer;
