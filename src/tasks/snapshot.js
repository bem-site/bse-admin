var util = require('util'),
    path = require('path'),

    vow = require('vow'),
    vowFs = require('vow-fs'),

    errors = require('../errors').TaskSnapshot,
    utility = require('../util'),
    logger = require('../logger');

module.exports = function (target) {
    logger.info('Start to create database snapshot', module);

    if (!target.getChanges().areModified()) {
        logger.warn('No changes were made during this synchronization. This step will be skipped', module);
        return vow.resolve(target);
    }

    var snapshotName = utility.getSnapshotName(),
        snapshotPath = path.join(target.SNAPSHOTS_DIR, snapshotName);

    target.setSnapshotName(snapshotName);

    return vowFs.makeDir(snapshotPath)
        .then(function () {
            return vow.all([
                utility.copyDir(path.join(target.DB_DIR, 'docs'), path.join(snapshotPath, 'docs')),
                utility.copyDir(path.join(target.DB_DIR, 'blocks'), path.join(snapshotPath, 'blocks')),
                utility.copyDir(path.join(target.DB_DIR, 'db.json'), path.join(snapshotPath, 'db.json'))
            ]);
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
            logger.info(util.format('Data snapshot %s has been created successfully', snapshotName), module);
            return vow.resolve(target);
        })
        .fail(function (err) {
            errors.createError(errors.CODES.COMMON, { err: err }).log();
            return vow.reject(err);
        });
};
