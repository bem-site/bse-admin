var util = require('util'),
    path = require('path'),

    vow = require('vow'),
    vowFs = require('vow-fs'),

    levelDb = require('../level-db'),
    utility = require('../util'),
    logger = require('../logger');

/**
 * Generates name of snapshot
 * @returns {String}
 */
function getSnapshotName() {
    var date = new Date();
    return util.format('%s:%s:%s-%s:%s:%s',
        date.getDate(),
        date.getMonth() + 1,
        date.getFullYear(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds()
    );
}

module.exports = function (target) {
    logger.info('Start to create database snapshot', module);

    if (!target.getChanges().areModified()) {
        logger.warn('No changes were made during this synchronization. This step will be skipped', module);
        return vow.resolve(target);
    }

    var snapshotName = getSnapshotName(),
        snapshotPath = path.join(target.SNAPSHOTS_DIR, snapshotName);
    return vowFs.makeDir(snapshotPath)
        .then(function () {
            return levelDb.copy(snapshotPath);
        })
        .then(function () {
            var meta = {
                date: snapshotName,
                changes: target.getChanges()
            };
            return vowFs.write(path.join(snapshotPath, 'data.json'), JSON.stringify(meta, null, 4));
        })
        .then(function () {
            var searchDirPath = path.join(target.CACHE_DIR, 'search');
            return vowFs.exists(searchDirPath)
                .then(function (exists) {
                    return exists ? utility.copyDir(searchDirPath, snapshotPath) : vow.resolve();
                });
        })
        .then(function () {
            logger.info(util.format('Database snapshot %s has been created successfully', snapshotName), module);
            return vow.resolve(target);
        })
        .fail(function (err) {
            logger.error(util.format('Database snapshot creation failed with error', err.message), module);
            return vow.reject(err);
        });
};
