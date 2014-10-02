'use strict';

var vow = require('vow'),

    logger = require('../logger'),
    config = require('../config'),
    providers = require('../providers/index'),

    KEY = {
        VERSIONS: 'versions',
        PEOPLE_PREFIX: 'people:'
    },

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
 * Remove all records for keys started with people key prefix
 * @returns {*}
 */
function removeOldPeopleData() {
    logger.debug('Remove existed people data from local database', module);

    return providers.getProviderLevelDB()
        .getKeysByCriteria(function(key) {
            return key.indexOf(KEY.PEOPLE_PREFIX) > -1;
        })
        .then(function(keys) {
            return providers.getProviderLevelDB().batch(keys.map(function(key) {
                return { type: 'del', key: key };
            }));
        });
}

function updatePeopleData(remote) {
    logger.warn('People data was changed. Changes will be synchronized with local database', module);

    var content = (new Buffer(remote.content, 'base64')).toString();
    try {
        content = JSON.parse(content);
    } catch (err) {
        logger.error('Error occur while parsing people data', module);
        return vow.resolve();
    }

    return removeOldPeopleData()
        .then(function() {
            //create and execute batch task for add new people data into database
            return providers.getProviderLevelDB()
                .batch(Object.keys(content).map(function(key) {
                    return { type: 'put', key: KEY.PEOPLE_PREFIX + key, value: JSON.stringify(content[key]) };
                }));
        })
        .then(function() {
            //get version object from database and update people sha sum
            return providers.getProviderLevelDB().get(KEY.VERSIONS).then(function (result) {
                result.people = remote.sha;
                return result;
            });
        })
        .then(function(updatedVersion) {
            //save updated versions object into database
            return providers.getProviderLevelDB().put(KEY.VERSIONS, updatedVersion);
        });
}

module.exports = function() {
    logger.info('Check if people data was changed start', module);
    if(!repo) {
        return vow.resolve();
    }

    /**
     * Load people data from remote gh repository
     * @returns {Object}
     */
    function loadFromRemote() {
        return providers.getProviderGhApi().load({ repository: repo }).then(function(result) {
            return result.res;
        });
    }

    /**
     * Load sha sum of people data from local database
     * @returns {String}
     */
    function loadFromLocal() {
        return providers.getProviderLevelDB().get(KEY.VERSIONS).then(function(result) {
            return result.people;
        });
    }

    return vow.all([loadFromLocal(), loadFromRemote()]).spread(function(local, remote) {
        var shaLocal = local,
            shaRemote = remote.sha;

        //compare local and remote sha keys
        if(shaLocal === shaRemote) {
            return vow.resolve();
        }
        return updatePeopleData(remote);
    });
};
