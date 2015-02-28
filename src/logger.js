'use strict';

var _ = require('lodash'),
    intel = require('intel'),

    Logger = function (mode, level, options) {
        this._init(mode, level, options);
    };

Logger.prototype = {

    _DEFAULT_LOG_MODE: 'testing',
    _DEFAULT_LOG_LEVEL: 'info',

    _mode: undefined,
    _level: undefined,
    _options: undefined,

    _baseHandlerConfiguration: {
        level: intel.VERBOSE,
        formatter: new intel.Formatter({
            format: '[%(date)s] %(levelname)s %(name)s: %(message)s',
            colorize: true
        })
    },

    /**
     * Logger initialization function
     * @param {String} mode - logger mode (development|testing|production)
     * @param {String} level - logger level (verbose|debug|info|warn|error)
     * @param {Object} options - advanced logger options
     * @private
     */
    _init: function (mode, level, options) {
        this._mode = mode || this._DEFAULT_LOG_MODE;
        this._level = level || this._DEFAULT_LOG_LEVEL;
        this._options = options;

        if (this._mode === 'development') {
            intel.setLevel(this._level);
            intel.addHandler(
                new intel.handlers.Console(_.extend({}, this._baseHandlerConfiguration))
            );
        }
    },

    /**
     * Returns logger by current mode and log level
     * @returns {Object} logger
     * @private
     */
    _getLogger: function () {
        var _this = this,
            getLFD = function () {
                var parent = module.parent;
                return intel.getLogger(parent.filename.split('/').slice(-2).join('/'));
            },
            getLFT = function () {
                return {
                    verbose: function () {},
                    debug: function () {},
                    info: function () {},
                    warn: console.warn,
                    error: console.error
                };
            },
            getLFP = function () {
                return ['verbose', 'debug', 'info', 'warn', 'error'].reduce(function (prev, item, index, arr) {
                    prev[item] = arr.slice(0, index + 1).indexOf(_this._level) > -1 ?
                        (console[item] || console.log) : function () {};
                    return prev;
                }, {});
            };

        return {
            development: getLFD(),
            testing: getLFT(),
            production: getLFP()
        }[this._mode];
    },

    /**
     * Alias for logging verbose messages
     * @param {String} str (string) for logging
     * @returns {*}
     */
    verbose: function (str) {
        return this._getLogger().verbose(str);
    },

    /**
     * Alias for logging debug messages
     * @param {String} str (string) for logging
     * @returns {*}
     */
    debug: function (str) {
        return this._getLogger().debug(str);
    },

    /**
     * Alias for logging info messages
     * @param {String} str (string) for logging
     * @returns {*}
     */
    info: function (str) {
        return this._getLogger(module).info(str);
    },

    /**
     * Alias for logging warn messages
     * @param {String} str (string) for logging
     * @returns {*}
     */
    warn: function (str) {
        return this._getLogger().warn(str);
    },

    /**
     * Alias for logging error messages
     * @param {String} str (string) for logging
     * @returns {*}
     */
    error: function (str) {
        return this._getLogger().error(str);
    }
};

module.exports = Logger;
