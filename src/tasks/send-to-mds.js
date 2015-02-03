var path = require('path'),
    util = require('util'),
    vow = require('vow'),
    vowFs = require('vow-fs'),

    config = require('../config'),
    errors = require('../errors').TaskSendToMds,
    storage = require('../storage').get(config.get('storage')),
    logger = require('../logger'),

    LEVEL_DB_DIR = 'leveldb',
    REGISTRY = 'db/registry';

/**
 * Sends snapshot files (except leveldb files) to mds
 * @param {TargetNodes} target - target object
 * @returns {*}
 * @private
 */
function _sendFiles(target) {
    var snapshotName = target.getSnapshotName(),
        snapshotPath = path.join(target.SNAPSHOTS_DIR, snapshotName);

    logger.debug(util.format('_send common files for snapshot %s', snapshotName), module);
    return vowFs.listDir(snapshotPath)
        .then(function (items) {
            return items.filter(function (item) {
               return item !== LEVEL_DB_DIR;
            });
        })
        .then(function (items) {
            return vow
                .all(items.map(function (item) {
                    return vowFs.read(path.join(snapshotPath, item), 'utf-8')
                        .then(function (content) {
                            var k = util.format('db/%s/%s', snapshotName, item);
                            logger.debug(k, module);
                            storage.writeP(k, content);
                        });
                }))
                .then(function () {
                    return items;
                });
        });
}

/**
 * Sends leveldb files to mds
 * @param {TargetNodes} target - target object
 * @returns {*}
 * @private
 */
function _sendDb(target) {
    var snapshotName = target.getSnapshotName(),
        snapshotPath = path.join(target.SNAPSHOTS_DIR, snapshotName);

    logger.debug(util.format('_send database files for snapshot %s', snapshotName), module);
    return vowFs.listDir(path.join(snapshotPath, LEVEL_DB_DIR))
        .then(function (items) {
            return vow
                .all(items.map(function (item) {
                    return vowFs.read(path.join(snapshotPath, LEVEL_DB_DIR, item), 'utf-8')
                        .then(function (content) {
                            var k = util.format('db/%s/%s/%s', snapshotName, LEVEL_DB_DIR, item);
                            logger.debug(k, module);
                            storage.writeP(k, content);
                        });
                }))
                .then(function () {
                    return storage.writeP(util.format('db/%s/%s', snapshotName, LEVEL_DB_DIR), JSON.stringify(items));
                })
                .then(function () {
                    return LEVEL_DB_DIR;
                });
        });
}

module.exports = function (target) {
    logger.info('Start to send created snapshot into mds', module);

    if (!target.getChanges().areModified()) {
        logger.warn('No changes were made during this synchronization. This step will be skipped', module);
        return vow.resolve(target);
    }

    var snapshotName = target.getSnapshotName();

    return vow
        .all([_sendFiles(target), _sendDb(target)])
        .spread(function (files, leveldb) {
            return storage.writeP(util.format('db/%s', snapshotName), JSON.stringify([].concat(files, leveldb)));
        })
        .then(function () {
            return vowFs.listDir(target.SNAPSHOTS_DIR);
        })
        .then(function (registry) {
            return storage.writeP(REGISTRY, JSON.stringify(registry));
        })
        .fail(function (err) {
            errors.createError(errors.CODES.COMMON, { err: err }).log();
            return vow.reject(err);
        });
};
