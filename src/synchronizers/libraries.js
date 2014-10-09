'use strict';

var util = require('util'),
    path = require('path'),

    vow = require('vow'),

    logger = require('../logger'),
    utility = require('../util'),
    syncFiles = require('./libraries/sync-files'),
    syncDb = require('./libraries/sync-db'),

    CACHE_DIR = path.join(process.cwd(), 'cache', 'libraries'),
    BaseSynchronizer = require('./base').BaseSynchronizer,
    LibrariesSynchronizer = function() {};

LibrariesSynchronizer.prototype = Object.create(BaseSynchronizer.prototype);
LibrariesSynchronizer.prototype.executeFromCommand = function(opts) {
    var promise = vow.resolve();
    if(opts.noCache) {
        promise = utility.removeDir(CACHE_DIR);
    }
    return promise.then(function() {
        return BaseSynchronizer.prototype.executeFromCommand.apply(this);
    });
};

LibrariesSynchronizer.prototype._execute = function(changes) {
    logger.info('Check if libraries data was changed start', module);

    return syncFiles()
        .then(function() {
            if(changes.getLibraries().areModified() || changes.getNodes().areModified()) {
                return syncDb(changes);
            } else {
                return vow.resolve();
            }
        })
        .then(function() {
            logger.info('Libraries were synchronized  successfully', module);
            return vow.resolve();
        })
        .fail(function(err) {
            logger.error(util.format('Libraries synchronization failed with error %s', err.message), module);
            return vow.reject();
        });
};

exports.LibrariesSynchronizer = LibrariesSynchronizer;

