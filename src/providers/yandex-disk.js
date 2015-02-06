var vow = require('vow'),
    YandexDisk = require('yandex-disk').YandexDisk,

    errors = require('../errors').YandexDisk,
    disk;

module.exports = {

    /**
     * Initialize Yandex Disk module
     * @param {Object} options for Yandex Disk
     * @returns {*}
     */
    init: function (options) {
        if (!options) {
            errors.createError(errors.CODES.DISK_NOT_CONFIGURED).log('warn');
            return vow.resolve();
        }

        disk = new YandexDisk(options.user, options.password);
        return disk;
    },

    /**
     * Check if Yandex Disk was initialized
     * @returns {boolean}
     */
    isInitialized: function () {
        return !!disk;
    },

    /**
     * Writes file on yandex disk
     * @param {String} filePath - path to remote file on yandex disk
     * @param {String} content of file
     * @returns {*}
     */
    writeFile: function (filePath, content) {
        if (!disk) {
            errors.createError(errors.CODES.NOT_INITIALIZED).log('warn');
            return vow.resolve();
        }

        var def = vow.defer();
        disk.writeFile(filePath, content, 'utf-8', function (err) {
            if (err) {
                errors.createError(errors.CODES.WRITE_FILE).log();
                def.reject(err);
            } else {
                def.resolve();
            }
        });
        return def.promise();
    },

    /**
     * Uploads directory to Yandex Disk
     * @param {String} localDir - path to directory on local filesystem
     * @param {String} remoteDir - path to directory on Yandex Disk filesystem
     * @returns {*}
     */
    uploadDirectory: function (localDir, remoteDir) {
        if (!disk) {
            errors.createError(errors.CODES.NOT_INITIALIZED).log('warn');
            return vow.resolve();
        }

        var def = vow.defer();
        disk.uploadDir(localDir, remoteDir, function (err) {
            if (err) {
                errors.createError(errors.CODES.UPLOAD_DIR).log();
                def.reject(err);
            } else {
                def.resolve();
            }
        });
        return def.promise();
    }
};
