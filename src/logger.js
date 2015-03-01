'use sict';

var util = require('util'),
    chalk = require('chalk'),
    moment = require('moment'),
    Logger = function (module, level) {
        this._init(module, level);
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
     * @param {Module} moduleForLog that uses this logger instance
     * @param {String} level - logger level (verbose|debug|info|warn|error)
     * @private
     */
    _init: function (moduleForLog, level) {
        this._mode = process.env.NODE_ENV || this._DEFAULT_LOG_MODE;
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
            prefix += moduleForLog.parent.filename.split('/').slice(-2).join('/') + ': ';
            return prefix;
        };

        this._styleString = function (s, styles) {
            if (!this._options.color) {
                return s;
            }
            var f = styles.reduce(function (prev, item) {
                prev = prev[item];
                return prev;
            }, chalk);
            return f(s);
        };
    },

    /**
     * Alias for logging verbose messages
     * @returns {*}
     */
    verbose: function () {
        var s = util.format.apply(null, arguments);
        s = this._prefixString('verbose') + s;
        s = this._styleString(s, ['magenta']);
        return this._logger.verbose(s);
    },

    /**
     * Alias for logging debug messages
     * @returns {*}
     */
    debug: function () {
        var s = util.format.apply(null, arguments);
        s = this._prefixString('debug') + s;
        s = this._styleString(s, ['cyan']);
        return this._logger.debug(s);
    },

    /**
     * Alias for logging info messages
     * @returns {*}
     */
    info: function () {
        var s = util.format.apply(null, arguments);
        s = this._prefixString('info') + s;
        s = this._styleString(s, ['green']);
        return this._logger.info(s);
    },

    /**
     * Alias for logging warn messages
     * @returns {*}
     */
    warn: function () {
        var s = util.format.apply(null, arguments);
        s = this._prefixString('warn') + s;
        s = this._styleString(s, ['bold', 'yellow']);
        return this._logger.warn(s);
    },

    /**
     * Alias for logging error messages
     * @returns {*}
     */
    error: function () {
        var s = util.format.apply(null, arguments);
        s = this._prefixString('error') + s;
        s = this._styleString(s, ['bold', 'red']);
        return this._logger.error(s);
    }
};

module.exports = Logger;
