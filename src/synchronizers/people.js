'use strict';

var util = require('util'),

    vow = require('vow'),

    logger = require('../logger'),
    config = require('../config'),
    githubApi = require('../gh-api'),
    levelDb = require('../level-db'),

    KEY = {
        VERSIONS: 'versions:people',
        PEOPLE_PREFIX: 'people:'
    },

    BaseSynchronizer = require('./base').BaseSynchronizer,
    PeopleSynchronizer = function() {},

    repo = (function() {
        var pr = config.get('github:people');
        if(!pr) {
            logger.warn('Path to people data file has not been set in application configuration', module);
            return null;
        }

        pr = pr.match(/^https?:\/\/(.+?)\/(.+?)\/(.+?)\/(tree|blob)\/(.+?)\/(.+)/);
        if (!pr) {
            logger.warn('Path to people repository has invalid format', module);
            return null;
        }

        pr = {
            host: pr[1],
            user: pr[2],
            repo: pr[3],
            ref:  pr[5],
            path: pr[6]
        };
        pr.type = pr.host.indexOf('github.com') > -1 ? 'public' : 'private';
        return pr;
    })();

function updatePeopleData(remote) {
    var content = (new Buffer(remote.content, 'base64')).toString();
    try {
        content = JSON.parse(content);
    } catch (err) {
        logger.error('Error occur while parsing people data', module);
        return vow.resolve();
    }

    return levelDb.removeByKeyPrefix(KEY.PEOPLE_PREFIX)
        .then(function() {
            //create and execute batch task for add new people data into database
            return levelDb.batch(Object.keys(content).map(function(key) {
                    return {
                        type: 'put',
                        key: KEY.PEOPLE_PREFIX + key,
                        value: JSON.stringify(content[key])
                    };
                }));
        })
        .then(function() {
            //save updated versions object into database
            return levelDb.put(KEY.VERSIONS, remote.sha);
        });
}

PeopleSynchronizer.prototype = Object.create(BaseSynchronizer.prototype);
PeopleSynchronizer.prototype._execute = function(changes) {
    logger.info('Check if people data was changed start', module);
    if(!repo) {
        return vow.resolve();
    }

    /**
     * Load people data from remote gh repository
     * @returns {Object}
     */
    function loadFromRemote() {
        return githubApi.load({ repository: repo }).then(function(result) {
            return result.res;
        });
    }

    /**
     * Load sha sum of people data from local database
     * @returns {Object|String}
     */
    function loadFromLocal() {
        return levelDb.get(KEY.VERSIONS).fail(function() {
            return null;
        });
    }

    return vow.all([loadFromLocal(), loadFromRemote()]).spread(function(local, remote) {
        var promise = vow.resolve(),
            shaLocal = local,
            shaRemote = remote.sha,
            isDataChanged = shaLocal !== shaRemote;

        isDataChanged ?
            logger.warn('People data was changed. Changes will be synchronized with local database', module) :
            logger.info('People data was not changed from last check', module);

        if(isDataChanged) {
            promise = updatePeopleData(remote);
        }

        return promise
            .then(function() {
                logger.info('People data was checked successfully', module);
                return vow.resolve();
            })
            .fail(function(err) {
                logger.error(util.format('People data check failed with error', err), module);
                return vow.reject();
            });
    });
};

exports.PeopleSynchronizer = PeopleSynchronizer;
