var util = require('util'),
    path = require('path'),

    vow = require('vow'),
    vowFs = require('vow-fs'),

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
                a = a.split('-');
                b = b.split('-');
                var dmyA = a[0].split(':'),
                    dmyB = b[0].split(':'),
                    hmsA = a[1].split(':'),
                    hmsB = b[1].split(':'),
                    dateA = new Date(dmyA[0], dmyA[1] - 1, dmyA[2], hmsA[0], hmsA[1], hmsA[2], 0),
                    dateB = new Date(dmyB[0], dmyB[1] - 1, dmyB[2], hmsB[0], hmsB[1], hmsB[2], 0);

                return +dateB - +dateA;
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

    var symlinkPath = path.join(target.DB_DIR, 'testing');

    return getLatestSnapshot(target)
        .then(function (version) {
            return checkAndRemoveExistedSymlink(symlinkPath).then(function () {
                return vowFs.symLink(util.format('./snapshots/%s', version), symlinkPath, 'dir')
                    .then(function () {
                        logger.info(util.format('symlink for %s environment was set to %s version',
                            'testing', version), module);
                        return vow.resolve(target);
                    })
                    .fail(function (err) {
                        return vow.reject(err);
                    });
            });
        });
};
