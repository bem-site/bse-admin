var util = require('util'),
    path = require('path'),

    vow = require('vow'),
    vowFs = require('vow-fs'),

    config = require('../config'),
    errors = require('../errors').TaskSwitchSymlink,
    storage = require('../storage').get(config.get('storage')),
    logger = require('../logger');

/**
 * Returns name of latest created snapshot
 * @param {NodesTarget} target object
 * @returns {String}
 */
function getLatestSnapshot(target) {
    return vowFs.listDir(target.SNAPSHOTS_DIR)
        .then(function (snapshots) {
            snapshots = snapshots.sort(function (a, b) {
                var re = /(\d{1,2}):(\d{1,2}):(\d{1,4})-(\d{1,2}):(\d{1,2}):(\d{1,2})/;
                a = a.match(re);
                b = b.match(re);
                a = new Date(a[3], a[2] - 1, a[1], a[4], a[5], a[6], 0);
                b = new Date(b[3], b[2] - 1, b[1], b[4], b[5], b[6], 0);
                return b.getTime() - a.getTime();
            });
            return snapshots[0];
        });
}

/**
 * Check if symlink exists and remove it
 * @param {String} symlinkPath - path to symlink
 * @returns {*}
 */
function checkAndRemoveExistedSymlink(symlinkPath) {
    return vowFs.exists(symlinkPath).then(function (exists) {
        if (!exists) {
            return vow.resolve();
        }
        return vowFs.remove(symlinkPath);
    });
}

module.exports = function (target) {
    logger.info('Switch symlink start', module);

    if (!target.getChanges().areModified()) {
        logger.warn('No changes were made during this synchronization. This step will be skipped', module);
        return vow.resolve(target);
    }

    var symlinkPath = path.join(target.DB_DIR, 'testing');
    return getLatestSnapshot(target)
        .then(function (version) {
            return checkAndRemoveExistedSymlink(symlinkPath)
                .then(function () {
                    return vowFs.symLink(util.format('./snapshots/%s', version), symlinkPath, 'dir');
                })
                .then(function () {
                    logger.info(util.format('symlink for %s environment was set to %s version',
                        'testing', version), module);
                    return vow.resolve(target);
                })
                .then(function () {
                    return storage.writeP('db/testing', version);
                });
        })
        .fail(function (err) {
            errors.createError(errors.CODES.COMMON, { err: err }).log();
            return vow.reject(err);
        });
};
