var vow = require('vow'),
    YandexDisk = require('yandex-disk').YandexDisk,

    logger = require('./../logger'),
    errors = require('../errors').YandexDisk,

    YD = function (options) {
        this.init(options);
    },
    yd;

YD.prototype = {

    _options: undefined,
    _disk: undefined,

    /**
     * Initialize Yandex Disk module
     * @param {Object} options for Yandex Disk
     * @returns {*}
     */
    init: function (options) {
        if (!options) {
            logger.warn('Can\'t initialize Yandex Disk module. Configuration was not set', module);
            // errors.createError(errors.CODES.DISK_NOT_CONFIGURED).log('warn');
            return vow.resolve();
        }

        this._options = options;
        this._disk = new YandexDisk(options.user, options.password);
        return this;
    },

    /**
     * Check if Yandex Disk was initialized
     * @returns {boolean}
     */
    isInitialized: function () {
        return !!this._disk;
    },

    /**
     * Return namspace (root folder fo snapshots on Yandex Disk)
     * @returns {*}
     */
    getNamespace: function () {
        return this._options['namespace'];
    },

    /**
     * Writes file on yandex disk
     * @param {String} filePath - path to remote file on yandex disk
     * @param {String} content of file
     * @returns {*}
     */
    writeFile: function (filePath, content) {
        if (!this.isInitialized()) {
            errors.createError(errors.CODES.NOT_INITIALIZED).log('warn');
            return vow.resolve();
        }

        var def = vow.defer();
        this._disk.writeFile(filePath, content, 'utf-8', function (err) {
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
        if (!this.isInitialized()) {
            errors.createError(errors.CODES.NOT_INITIALIZED).log('warn');
            return vow.resolve();
        }

        var def = vow.defer();
        this._disk.uploadDir(localDir, remoteDir, function (err) {
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

module.exports = {
    init: function (options) {
        yd = new YD(options);
        return yd;
    },

    get: function () {
        return yd;
    }
};
