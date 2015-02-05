var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    zlib = require('zlib'),

    tar = require('tar'),
    vow = require('vow'),
    fstream = require('fstream'),
    YandexDisk = require('yandex-disk').YandexDisk,

    config = require('../config'),
    errors = require('../errors').TaskSendToYandexDisk,
    logger = require('../logger'),
    utility = require('../util'),

    LEVEL_DB_DIR = 'leveldb';

/**
 * Creates database archive from database folder
 * @param {TargetNodes} target object
 * @returns {*}
 * @private
 */
function _createDbArchive (target) {
    var def = vow.defer(),
        snapshotName = target.getSnapshotName(),
        snapshotPath = path.join(target.SNAPSHOTS_DIR, snapshotName);

    logger.debug(util.format('create db archive for snapshot %s', snapshotName), module);

    fstream.Reader({ path: path.join(snapshotPath, LEVEL_DB_DIR), type: 'Directory' })
        .pipe(tar.Pack())
        .pipe(zlib.Gzip())
        .pipe(fs.createWriteStream(path.join(snapshotPath, (LEVEL_DB_DIR + '.tar.gz'))))
        .on('error', function (err) {
            errors.createError(errors.CODES.COMMON, { err: err, snapshotName: snapshotName }).log();
            def.reject(err);
        })
        .on('close', function () {
            logger.debug(util.format('db archive successfully created for %s', snapshotName), module);
            def.resolve();
        })
        .on('end', function () {
            logger.debug(util.format('db archive successfully created for %s', snapshotName), module);
            def.resolve();
        });
    return def.promise();
}

/**
 * Remove database folder
 * @param {TargetNodes} target object
 * @returns {*}
 * @private
 */
function _removeDbFolder (target) {
    var snapshotName = target.getSnapshotName(),
        snapshotPath = path.join(target.SNAPSHOTS_DIR, snapshotName);
    return utility.removeDir(path.join(snapshotPath, LEVEL_DB_DIR));
}

/**
 * Sends all files in snapshot folder to Yandex Disk
 * @param {TargetNodes} target object
 * @returns {*}
 * @private
 */
function _sendToDisk (target) {
    var def = vow.defer(),
        snapshotName = target.getSnapshotName(),
        snapshotPath = path.join(target.SNAPSHOTS_DIR, snapshotName),
        destinationPath = path.join(config.get('disk:namespace'), snapshotName),
        disk = new YandexDisk(config.get('disk:user'), config.get('disk:user'));

    logger.debug(util.format('send folder %s to yandex disk %s', snapshotPath, destinationPath), module);
    disk.uploadDir(snapshotPath, destinationPath, function (err) {
        err ? def.reject(err) : def.resolve();
    });

    return def.promise();
}

module.exports = function (target) {
    logger.info('Start to send created snapshot into mds', module);

    if (!target.getChanges().areModified()) {
        logger.warn('No changes were made during this synchronization. This step will be skipped', module);
        return vow.resolve(target);
    }

    if (!config.get('disk')) {
        errors.createError(errors.CODES.DISK_NOT_CONFIGURED).warn();
        return vow.resolve(target);
    }

    return _createDbArchive(target)
        .then(function () {
            return _removeDbFolder(target);
        })
        .then(function () {
            return _sendToDisk(target);
        })
        .then(function () {
            return vow.resolve(target);
        })
        .fail(function (err) {
            errors.createError(errors.CODES.COMMON, { err: err }).log();
            return vow.reject(err);
        });
};
