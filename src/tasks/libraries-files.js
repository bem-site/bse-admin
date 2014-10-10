'use strict';

var util = require('util'),
    path = require('path'),

    _ = require('lodash'),
    vow = require('vow'),
    vowFs = require('vow-fs'),

    logger = require('../logger'),
    config = require('../config'),
    githubApi = require('../gh-api'),
    utility = require('../util'),

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
    return githubApi.load({ repository: _.extend({ path: '' }, repo) });
}

/**
 * Returns list of libraries folders from local filesystem temporary folder
 * @param {TargetLibraries} target object
 * @returns {Array}
 */
function getLocalLibraries(target) {
    return vowFs.listDir(target.LIBRARIES_FILE_PATH);
}

/**
 * Returns list of version folders for given library from remote github repository with compiled libraries data
 * @param {String} lib - name of library
 * @returns {*}
 */
function getRemoteVersions(lib) {
    return githubApi.load({ repository: _.extend({ path: lib }, repo) });
}

/**
 * Returns list of version folders for given library from local filesystem temporary folder
 * @param {TargetLibraries} target object
 * @param {String} lib - name of library
 */
function getLocalVersions(target, lib) {
    return vowFs.listDir(path.join(target.LIBRARIES_FILE_PATH, lib));
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
 * @param {TargetLibraries} target object
 * @param {Array} libs - array with directory names
 * @returns {*}
 */
function addLibDirectories(target, libs) {
    if(!libs.length) {
        return vow.resolve();
    }
    return vow.all(libs.map(function(item) {
        target.getChanges().getLibraries().addAdded({ lib: item });
        return vowFs.makeDir(path.join(target.LIBRARIES_FILE_PATH, item));
    }));
}

/**
 * Removes library directories from local filesystem
 * @param {TargetLibraries} target object
 * @param {Array} libs - array with directory names
 * @returns {*}
 */
function removeLibDirectories(target, libs) {
    if(!libs.length) {
        return vow.resolve();
    }
    return vow.all(libs.map(function(item) {
        target.getChanges().getLibraries().addRemoved({ lib: item });
        return vowFs.removeDir(path.join(target.LIBRARIES_FILE_PATH, item));
    }));
}

/**
 * Creates library version directories on local filesystem
 * @param {TargetLibraries} target object
 * @param {String} lib - name of library
 * @param {Array} versions - array of version names
 * @returns {*}
 */
function addLibVersionDirectories(target, lib, versions) {
    if(!lib || !versions.length) {
        return vow.resolve();
    }
    return vow.all(versions.map(function(item) {
        target.getChanges().getLibraries().addAdded({ lib: lib, version: item });
        return vowFs.makeDir(path.join(target.LIBRARIES_FILE_PATH, lib, item));
    }));
}

/**
 * Removes library version directories from local filesystem
 * @param {TargetLibraries} target object
 * @param {String} lib - name of library
 * @param {Array} versions - array of version names
 * @returns {*}
 */
function removeLibVersionDirectories(target, lib, versions) {
    if(!lib || !versions.length) {
        return vow.resolve();
    }
    return vow.all(versions.map(function(item) {
        target.getChanges().getLibraries().addRemoved({ lib: lib, version: item });
        return vowFs.removeDir(path.join(target.LIBRARIES_FILE_PATH, lib, item));
    }));
}

/**
 * Get sha sum of remote data.json file
 * @param {String} lib - name of library
 * @param {Array} version - array of version names
 * @returns {*}
 */
function getShaOfRemoteDataFile(lib, version) {
    return githubApi.load({
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
 * @param {TargetLibraries} target object
 * @param {String} lib - name of library
 * @param {String} version - name of version
 * @returns {*}
 */
function getShaOfLocalDataFile(target, lib, version) {
    return vowFs.read(path.join(target.LIBRARIES_FILE_PATH, lib, version, '_data.json'), 'utf-8')
        .then(function(data) {
            return vow.fulfill(data);
        })
        .fail(function() {
            return vow.fulfill(null);
        });
}

/**
 * Downloads data.json file for given library and version
 * @param {TargetLibraries} target object
 * @param {String} lib - name of library
 * @param {String} version - name of version
 * @returns {*}
 */
function downloadFile(target, lib, version) {
    return utility.loadFromRepoToFile({
        repository: _.extend({ path: path.join(lib, version, 'data.json') }, repo),
        file: path.join(target.LIBRARIES_FILE_PATH, lib, version, 'data.json')
    });
}

/**
 * Compare data.json file of versions between local and remote
 * @param {TargetLibraries} target object
 * @param {String} lib - name of version
 * @param {Array} versions - array of library versions
 * @returns {*}
 */
function compareFiles(target, lib, versions) {
    if(!lib || !versions.length) {
        return vow.resolve();
    }
    return vow.all(versions.map(function(version) {
        return vow.all([
            getShaOfLocalDataFile(target, lib, version),
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
                    target.getChanges().getLibraries().addModified({ lib: lib, version: version });
                    promise = vowFs.remove(path.join(target.LIBRARIES_FILE_PATH, lib, version, 'data.json'));
                }
                return promise
                    .then(function() {
                        return downloadFile(target, lib, version);
                    })
                    .then(function() {
                        vowFs.write(path.join(target.LIBRARIES_FILE_PATH, lib, version, '_data.json'), remote);
                    });
            });
    }));
}

/**
 *
 * @param {TargetLibraries} target object
 * @param {String} lib - name of library
 * @returns {*}
 */
function syncLibVersion(target, lib) {
    return vow.all([getLocalVersions(target, lib), getRemoteVersions(lib)])
        .spread(function(local, remote) {
            remote = remote.res;
            remote = remote.map(function(item) {
                return item.name;
            });

            return vow.all([
                addLibVersionDirectories(target, lib, _.difference(remote, local)),
                removeLibVersionDirectories(target, lib, _.difference(local, remote))
            ])
                .then(function() {
                    return compareFiles(target, lib, remote);
                });
        });
}

module.exports = function(target) {
    if(!repo) {
        logger.warn('Libraries configuration was not recognized. Libraries synchronization will be skipped', module);
        return vow.resolve();
    }

    return vowFs.makeDir(target.LIBRARIES_FILE_PATH)
        .then(function() {
            return vow.all([getLocalLibraries(target), getRemoteLibraries()]);
        })
        .spread(function(local, remote) {
            remote = filterMapRemote(remote);

            return vow.all([
                    addLibDirectories(target, _.difference(remote, local)),
                    removeLibDirectories(target, _.difference(local, remote))
                ])
                .then(function() {
                    return remote;
                });
        })
        .then(function(remote) {
            return vow.all(remote.map(function(item) {
                return syncLibVersion(target, item);
            }));
        })
        .then(function() {
            logger.info('Libraries were synchronized successfully with cache on local filesystem', module);
            return vow.resolve(target);
        })
        .fail(function(err) {
            logger.error(util.format('Libraries synchronization with cache failed with error %s', err.message), module);
            return vow.reject(err);
        });
};
