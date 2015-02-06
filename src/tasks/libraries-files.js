'use strict';

var util = require('util'),
    path = require('path'),

    _ = require('lodash'),
    vow = require('vow'),
    vowFs = require('vow-fs'),

    constants = require('../constants'),
    logger = require('../logger'),
    errors = require('../errors').TaskLibrariesFiles,
    storage = require('../providers/mds');

/**
 * Returns list of libraries folders from configured remote github repository with compiled libraries data
 * @returns {Object}
 */
function loadRegistry() {
    return storage.get().readP(constants.REGISTRY_KEY).then(function (registry) {
        try {
            return JSON.parse(registry);
        } catch (err) {
            return {};
        }
    });
}

/**
 * Returns list of libraries folders from local filesystem temporary folder
 * @param {TargetNodes} target object
 * @returns {Array}
 */
function getLocalLibraries(target) {
    return vowFs.listDir(target.LIBRARIES_FILE_PATH);
}

/**
 * Returns list of version folders for given library from local filesystem temporary folder
 * @param {TargetNodes} target object
 * @param {String} lib - name of library
 */
function getLocalVersions(target, lib) {
    return vowFs.listDir(path.join(target.LIBRARIES_FILE_PATH, lib));
}

/**
 * Creates library directories on local filesystem
 * @param {TargetNodes} target object
 * @param {Array} libs - array with directory names
 * @returns {*}
 */
function addLibDirectories(target, libs) {
    if (!libs.length) {
        return vow.resolve();
    }
    return vow.all(libs.map(function (item) {
        return vowFs.makeDir(path.join(target.LIBRARIES_FILE_PATH, item));
    }));
}

/**
 * Removes library directories from local filesystem
 * @param {TargetNodes} target object
 * @param {Array} libs - array with directory names
 * @returns {*}
 */
function removeLibDirectories(target, libs) {
    if (!libs.length) {
        return vow.resolve();
    }
    return vow.all(libs.map(function (item) {
        return vowFs.removeDir(path.join(target.LIBRARIES_FILE_PATH, item));
    }));
}

/**
 * Creates library version directories on local filesystem
 * @param {TargetNodes} target object
 * @param {String} lib - name of library
 * @param {Array} versions - array of version names
 * @returns {*}
 */
function addLibVersionDirectories(target, lib, versions) {
    if (!lib || !versions.length) {
        return vow.resolve();
    }
    return vow.all(versions.map(function (item) {
        return vowFs.makeDir(path.join(target.LIBRARIES_FILE_PATH, lib, item));
    }));
}

/**
 * Removes library version directories from local filesystem
 * @param {TargetNodes} target object
 * @param {String} lib - name of library
 * @param {Array} versions - array of version names
 * @returns {*}
 */
function removeLibVersionDirectories(target, lib, versions) {
    if (!lib || !versions.length) {
        return vow.resolve();
    }
    return vow.all(versions.map(function (item) {
        return vowFs.removeDir(path.join(target.LIBRARIES_FILE_PATH, lib, item));
    }));
}

/**
 * Returns sha sum of local data.json file
 * @param {TargetNodes} target object
 * @param {String} lib - name of library
 * @param {String} version - name of version
 * @returns {*}
 */
function getShaOfLocalDataFile(target, lib, version) {
    return vowFs.read(path.join(target.LIBRARIES_FILE_PATH, lib, version, '_data.json'), 'utf-8')
        .then(function (data) {
            return vow.fulfill(data);
        })
        .fail(function () {
            return vow.fulfill(null);
        });
}

/**
 * Downloads data.json file for given library and version
 * @param {TargetNodes} target object
 * @param {String} lib - name of library
 * @param {String} version - name of version
 * @returns {*}
 */
function downloadFile(target, lib, version) {
    var destinationPath = path.join(target.LIBRARIES_FILE_PATH, lib.name, version, 'data.json');
    return storage.get().readP(util.format('%s/%s/data.json', lib.name, version))
        .then(function (content) {
            return vowFs.write(destinationPath, content, 'utf-8');
        });
}

/**
 * Compare data.json file of versions between local and remote
 * @param {TargetNodes} target object
 * @param {String} lib - name of version
 * @returns {*}
 */
function compareFiles(target, lib) {
    var versions = Object.keys(lib.versions);

    if (!lib || !versions.length) {
        return vow.resolve();
    }

    return vow.all(versions.map(function (version) {
        return vow.all([
            getShaOfLocalDataFile(target, lib.name, version),
            lib.versions[version].sha
        ])
            .spread(function (local, remote) {
                if (!remote || (local && local === remote)) {
                    return vow.resolve();
                }

                var promise = vow.resolve();
                if (!local) {
                    logger.warn(util.format('Library version %s %s was added', lib.name, version), module);
                }

                // compare local and remote file versions
                if (local && local !== remote) {
                    logger.warn(util.format('Library version %s %s was changed', lib.name, version), module);
                    promise = vowFs.remove(path.join(target.LIBRARIES_FILE_PATH, lib.name, version, 'data.json'));
                }
                return promise
                    .then(function () {
                        return downloadFile(target, lib, version);
                    })
                    .then(function () {
                        return vowFs.write(
                            path.join(target.LIBRARIES_FILE_PATH, lib.name, version, '_data.json'), remote);
                    });
            });
    }));
}

/**
 *
 * @param {TargetNodes} target object
 * @param {String} lib - name of library
 * @returns {*}
 */
function syncLibVersion(target, lib) {
    logger.debug(util.format('Synchronize %s library', lib.name), module);
    return getLocalVersions(target, lib.name)
        .then(function (local) {
            var versions = Object.keys(lib.versions);

            return vow.all([
                addLibVersionDirectories(target, lib.name, _.difference(versions, local)),
                removeLibVersionDirectories(target, lib.name, _.difference(local, versions))
            ])
                .then(function () {
                    return compareFiles(target, lib);
                });
        });
}

module.exports = function (target) {
    return vowFs.makeDir(target.LIBRARIES_FILE_PATH)
        .then(function () {
            return vow.all([getLocalLibraries(target), loadRegistry()]);
        })
        .spread(function (local, registry) {
            var remote = Object.keys(registry);

            return vow.all([
                addLibDirectories(target, _.difference(remote, local)),
                removeLibDirectories(target, _.difference(local, remote))
            ])
                .then(function () {
                    return registry;
                });
        })
        .then(function (registry) {
            return Object.keys(registry).reduce(function (prev, lib) {
                prev = prev.then(function () {
                    return syncLibVersion(target, registry[lib]);
                });
                return prev;
            }, vow.resolve());
        })
        .then(function () {
            logger.info('Libraries were synchronized successfully with cache on local filesystem', module);
            return vow.resolve(target);
        })
        .fail(function (err) {
            errors.createError(errors.CODES.COMMON, { err: err }).log();
            return vow.reject(err);
        });
};
