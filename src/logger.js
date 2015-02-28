'use strict';

var chalk = require('chalk'),
    moment = require('moment'),
    Logger = function (mode, level) {
        this._init(mode, level);
    };

Logger.prototype = {

    _DEFAULT_LOG_MODE: 'testing',
    _DEFAULT_LOG_LEVEL: 'info',

    _mode: undefined,
    _level: undefined,
    _options: undefined,
    _logger: undefined,
    _prefixString: undefined,
    _styleString: undefined,

    /**
     * Logger initialization function
     * @param {String} mode - logger mode (development|testing|production)
     * @param {String} level - logger level (verbose|debug|info|warn|error)
     * @private
     */
    _init: function (mode, level) {
        this._mode = mode || this._DEFAULT_LOG_MODE;
        this._level = level || this._DEFAULT_LOG_LEVEL;
        this._options = {};

        if (this._mode === 'testing') {
            this._logger = {
                verbose: function () {},
                debug: function () {},
                info: function () {},
                warn: console.warn,
                error: console.error
            };
        } else {
            var _this = this;
            this._logger = ['verbose', 'debug', 'info', 'warn', 'error'].reduce(function (prev, item, index, arr) {
                prev[item] = arr.slice(0, index + 1).indexOf(_this._level) > -1 ?
                    (console[item] || console.log) : function () {};
                return prev;
            }, {});

            if (this._mode === 'development') {
                this._options.color = true;
                this._options.useDate = true;
            }
        }

        this._prefixString = function (level) {
            var prefix = '';
            if (this._options.useDate) {
                prefix = '[' + moment().format('YYYY-MM-DD HH:mm:SS') + ']';
            }
            prefix += ' ' + level.toUpperCase() + ' ';
            prefix += module.parent.filename.split('/').slice(-2).join('/') + ': ';
            return prefix;
        };

        this._styleString = function (str, styles) {
            if (!this._options.color) {
                return str;
            }
            var f = styles.reduce(function (prev, item) {
                prev = prev[item];
                return prev;
            }, chalk);
            return f(str);
        };
    },

    /**
     * Alias for logging verbose messages
     * @param {String} str (string) for logging
     * @returns {*}
     */
    verbose: function (str) {
        str = this._prefixString('verbose') + str;
        str = this._styleString(str, ['magenta']);
        return this._logger.verbose(str);
    },

    /**
     * Alias for logging debug messages
     * @param {String} str (string) for logging
     * @returns {*}
     */
    debug: function (str) {
        str = this._prefixString('debug') + str;
        str = this._styleString(str, ['cyan']);
        return this._logger.debug(str);
    },

    /**
     * Alias for logging info messages
     * @param {String} str (string) for logging
     * @returns {*}
     */
    info: function (str) {
        str = this._prefixString('info') + str;
        str = this._styleString(str, ['green']);
        return this._logger.info(str);
    },

    /**
     * Alias for logging warn messages
     * @param {String} str (string) for logging
     * @returns {*}
     */
    warn: function (str) {
        str = this._prefixString('warn') + str;
        str = this._styleString(str, ['bold', 'yellow']);
        return this._logger.warn(str);
    },

    /**
     * Alias for logging error messages
     * @param {String} str (string) for logging
     * @returns {*}
     */
    error: function (str) {
        str = this._prefixString('error') + str;
        str = this._styleString(str, ['bold', 'red']);
        return this._logger.error(str);
    }
};

module.exports = Logger;
