'use strict';

var util = require('util'),

    vow = require('vow'),

    logger = require('../logger'),
    config = require('../config'),
    githubApi = require('../gh-api'),
    levelDb = require('../level-db'),

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
function loadFromLocal(target) {
    return levelDb.get(target.KEY.VERSIONS_PEOPLE).fail(function() {
        return null;
    });
}

function updatePeopleData(target, remote) {
    var content = (new Buffer(remote.content, 'base64')).toString();
    try {
        content = JSON.parse(content);
    } catch (err) {
        logger.error('Error occur while parsing people data', module);
        return vow.reject();
    }

    return levelDb.removeByKeyPrefix(target.KEY.PEOPLE_PREFIX)
        .then(function() {
            //create and execute batch task for add new people data into database
            return levelDb.batch(Object.keys(content).map(function(key) {
                    return {
                        type: 'put',
                        key: target.KEY.PEOPLE_PREFIX + key,
                        value: content[key]
                    };
                }));
        })
        .then(function() {
            //save updated versions object into database
            return levelDb.put(target.KEY.VERSIONS_PEOPLE, remote.sha);
        });
}

module.exports = function(target) {
    logger.info('Check if people data was changed start', module);
    if(!repo) {
        logger.warn('People configuration was not recognized. People synchronization will be skipped', module);
        return vow.resolve(target);
    }

    return vow.all([loadFromLocal(target), loadFromRemote()]).spread(function(local, remote) {
        var promise = vow.resolve(),
            isDataChanged = local !== remote.sha;

        isDataChanged ?
            logger.warn('People data was changed. Changes will be synchronized with local database', module) :
            logger.info('People data was not changed from last check', module);

        if(isDataChanged) {
            promise = updatePeopleData(target, remote);
        }

        return promise
            .then(function() {
                logger.info('People data was synchronized successfully', module);
                return vow.resolve(target);
            })
            .fail(function(err) {
                logger.error(util.format('People data synchronization failed with error', err), module);
                return vow.reject(err);
            });
    });
};
