var fs = require('fs'),
    url = require('url'),
    path = require('path'),
    zlib = require('zlib'),

    request = require('request'),
    constants = require('../constants'),
    Logger = require('../logger'),

    SendModel = function (options) {
        this._init(options);
    };

SendModel.prototype = {
    _link: undefined,
    _logger: undefined,

    /**
     * Initialize script for sending model file to remote build server
     * @param {Object} options object with fields:
     * - {String} host - host of remote build server
     * - {String} port - port of remote build server
     * @private
     */
    _init: function (options) {
        this._logger = new Logger('debug');

        var errorMessage;
        if (!options) {
            errorMessage = 'No options were given';
        }

        if (!errorMessage && !options.host) {
            errorMessage = 'Provider host undefined';
        }

        if (!errorMessage && !options.port) {
            errorMessage = 'Provider port undefined';
        }

        if (errorMessage) {
            this._logger.error(errorMessage);
            throw new Error(errorMessage);
        }

        this._link = url.format({
            protocol: 'http',
            hostname: options.host,
            port: options.port,
            pathname: '/model'
        });
    },

    /**
     * Executes current script
     * @param {Function} callback function
     */
    execute: function (callback) {
        var _this = this,
            onError = function (error) {
                _this._logger.error('Error occur while sending model file to %s. Error: %s', _this._link, error);
                callback && callback(error);
            },
            onSuccess = function () {
                _this._logger.info('Model has been successfully sent to %s', _this._link);
                callback && callback(null);
            };

        fs.createReadStream(path.join(constants.DIRECTORY.MODEL, constants.FILE.MODEL))
            .pipe(zlib.createGzip())
            .pipe(request.post(this._link))
            .on('error', onError)
            .on('end', onSuccess);
    }
};

module.exports = SendModel;
