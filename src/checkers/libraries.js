'use strict';

var util = require('util'),
    path = require('path'),

    _ = require('lodash'),
    vow = require('vow'),
    sha = require('sha1'),

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

/**
 * Get sha sum of remote data.json file
 * @param {String} lib - name of library
 * @param {Array} versions - array of version names
 * @returns {*}
 */
function getShaOfRemoteDataFile(lib, version) {
    return providers.getProviderGhApi().load({
        repository: _.extend({ path: path.join(lib, version) }, repo)
    }).then(function(result) {
        result = result.res;
        result = result.filter(function(item) {
            return item.name === 'data.json';
        })[0];

        return result ? result.sha : null;
    });
}

/**
 * Returns sha sum of local data.json file
 * @param {String} lib - name of library
 * @param {String} version - name of version
 * @returns {*}
 */
function getShaOfLocalDataFile(lib, version) {
    return providers.getProviderFile().load({ path: path.join(TEMP_DIR, lib, version, '_data.json') })
        .then(function(data) {
            return vow.fulfill(data);
        })
        .fail(function() {
            return vow.fulfill(null);
        });
}

/**
 * Downloads data.json file for given library and version
 * @param {String} lib - name of library
 * @param {String} version - name of version
 * @returns {*}
 */
function downloadFile(lib, version) {
    return providers.getProviderGhHttps().loadFromRepoToFile({
        repository: _.extend({ path: path.join(lib, version, 'data.json') }, repo),
        file: path.join(TEMP_DIR, lib, version, 'data.json')
    });
}

/**
 * Compare data.json file of versions between local and remote
 * @param {String} lib - name of version
 * @param {Array} versions - array of library versions
 * @returns {*}
 */
function compareFiles(lib, versions) {
    if(!lib || !versions.length) {
        return vow.resolve();
    }
    return vow.all(versions.map(function(version) {
        return vow.all([
                getShaOfLocalDataFile(lib, version),
                getShaOfRemoteDataFile(lib, version)
            ])
            .spread(function(local, remote) {
                if(!remote || (local && local === remote)) {
                    return vow.resolve();
                }

                var promise = vow.resolve();
                if(!local) {
                    logger.warn(util.format('Library version %s %s was added', lib, version), module);
                }

                //compare local and remote file versions
                if(local && local !== remote) {
                    logger.warn(util.format('Library version %s %s was changed', lib, version), module);
                    promise = providers.getProviderFile().remove({
                        path: path.join(TEMP_DIR, lib, version, 'data.json')
                    });
                }
                return promise
                    .then(function() {
                        return downloadFile(lib, version);
                    })
                    .then(function() {
                       providers.getProviderFile().save({
                           path: path.join(TEMP_DIR, lib, version, '_data.json'),
                           data: remote
                       });
                    });
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
                    return compareFiles(lib, remote);
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

