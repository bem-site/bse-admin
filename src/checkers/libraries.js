'use strict';

var util = require('util'),
    path = require('path'),

    _ = require('lodash'),
    vow = require('vow'),

    logger = require('../logger'),
    config = require('../config'),
    providers = require('../providers/index'),

    TEMP_DIR = path.join(process.cwd(), 'temp'),

    repo = (function() {
        var isValidConfiguration = true,
            repo = config.get('github:libraries');

        if(!repo) {
            isValidConfiguration = false;
            logger.error('Libraries repository was not set in configuration', module);
        }
        else if(!repo.type || !_.isString(repo.type) || !repo.type.length) {
            isValidConfiguration = false;
            logger.error('Type of libraries repository was not set in configuration', module);
        }
        else if(!repo.user || !_.isString(repo.user) || !repo.user.length) {
            isValidConfiguration = false;
            logger.error('User field of libraries repository was not set in configuration', module);
        }
        else if(!repo.repo || !_.isString(repo.repo) || !repo.repo.length) {
            isValidConfiguration = false;
            logger.error('Name of libraries repository was not set in configuration', module);
        }
        else if(!repo.ref  || !_.isString(repo.ref)  || !repo.ref.length) {
            isValidConfiguration = false;
            logger.error('Reference of libraries repository was not set in configuration', module);
        }
        else if(!repo.pattern || !_.isString(repo.pattern) || !repo.pattern.length) {
            isValidConfiguration = false;
            logger.error('Pattern for libraries repository was not set in configuration', module);
        }
        return isValidConfiguration ? repo : null;
    })();

/**
 * Returns list of libraries folders from configured remote github repository with compiled libraries data
 * @returns {Object}
 */
function getRemoteLibraries() {
    return providers.getProviderGhApi().load({ repository: _.extend({ path: '' }, repo) });
}

/**
 * Returns list of libraries folders from local filesystem temporary folder
 * @returns {Array}
 */
function getLocalLibraries() {
    return providers.getProviderFile().listDir({ path: TEMP_DIR });
}

/**
 * Returns list of version folders for given library from remote github repository with compiled libraries data
 * @param {String} lib - name of library
 * @returns {*}
 */
function getRemoteVersions(lib) {
    return providers.getProviderGhApi().load({ repository: _.extend({ path: lib }, repo) });
}

/**
 * Returns list of version folders for given library from local filesystem temporary folder
 * @param {String} lib - name of library
 */
function getLocalVersions(lib) {
    return providers.getProviderFile().listDir({ path: path.join(TEMP_DIR, lib) });
}

function filterMapRemote(remote) {
    remote = remote.res;
    if(!remote || !remote.length) {
        return [];
    }

    return remote
        .map(function(item) {
            return item.name;
        })
        .filter(function(item) {
            return ['.gitignore', 'freeze', 'repositories.json'].indexOf(item) < 0;
        });
}

/**
 * Creates library directories on local filesystem
 * @param {Array} libs - array with directory names
 * @returns {*}
 */
function addLibDirectories(libs) {
    if(!libs.length) {
        return vow.resolve();
    }
    return vow.all(libs.map(function(item) {
        return providers.getProviderFile().makeDir({ path: path.join(TEMP_DIR, item) });
    }));
}

/**
 * Removes library directories from local filesystem
 * @param {Array} libs - array with directory names
 * @returns {*}
 */
function removeLibDirectories(libs) {
    if(!libs.length) {
        return vow.resolve();
    }
    return vow.all(libs.map(function(item) {
        return providers.getProviderFile().removeDir({ path: path.join(TEMP_DIR, item) });
    }));
}

/**
 * Creates library version directories on local filesystem
 * @param {String} lib - name of library
 * @param {Array} versions - array of version names
 * @returns {*}
 */
function addLibVersionDirectories(lib, versions) {
    if(!lib || !versions.length) {
        return vow.resolve();
    }
    return vow.all(versions.map(function(item) {
        return providers.getProviderFile().makeDir({ path: path.join(TEMP_DIR, lib, item) });
    }));
}

/**
 * Removes library version directories from local filesystem
 * @param {String} lib - name of library
 * @param {Array} versions - array of version names
 * @returns {*}
 */
function removeLibVersionDirectories(lib, versions) {
    if(!lib || !versions.length) {
        return vow.resolve();
    }
    return vow.all(versions.map(function(item) {
        return providers.getProviderFile().removeDir({ path: path.join(TEMP_DIR, lib, item) });
    }));
}

function downloadFiles(lib, versions) {
    if(!lib || !versions.length) {
        return vow.resolve();
    }
    return vow.all(versions.map(function(version) {
        return providers.getProviderGhHttps().loadFromRepoToFile({
            repository: _.extend({ path: path.join(lib, version, 'data.json') }, repo),
            file: path.join(TEMP_DIR, lib, version, 'data.json')
        });
    }));
}

function syncLibVersion(lib) {
    return vow.all([getLocalVersions(lib), getRemoteVersions(lib)])
        .spread(function(local, remote) {
            remote = remote.res;
            remote = remote.map(function(item) {
                return item.name;
            });

            return vow.all([
                    addLibVersionDirectories(lib, _.difference(remote, local)),
                    removeLibVersionDirectories(lib, _.difference(local, remote))
                ])
                .then(function() {
                    return downloadFiles(lib, _.difference(remote, local));
                });
        });
}

module.exports = function() {
    logger.info('Check if libraries data was changed start', module);

    if(!repo) {
        return vow.resolve();
    }

    return providers.getProviderFile()
        .makeDir({ path: TEMP_DIR })
        .then(function() {
            return vow.all([getLocalLibraries(), getRemoteLibraries()]);
        })
        .spread(function(local, remote) {
            remote = filterMapRemote(remote);

            return vow.all([
                    addLibDirectories(_.difference(remote, local)),
                    removeLibDirectories(_.difference(local, remote))
                ])
                .then(function() {
                    return remote;
                });
        })
        .then(function(remote) {
            return vow.all(remote.map(function(item) {
                return syncLibVersion(item);
            }));
        })
        .then(function() {
            logger.info('Libraries were synchronized  successfully', module);
        })
        .fail(function(err) {
            logger.error(util.format('Libraries synchronization failed with error %s', err.message), module);
        });
};

