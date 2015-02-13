'use strict';

var fs = require('fs'),
    path = require('path'),

    _ = require('lodash'),
    intel = require('intel'),
    baseHandlerConfig = {
        level: intel.VERBOSE,
        formatter: new intel.Formatter({
            format: '[%(date)s] %(levelname)s %(name)s: %(message)s',
            colorize: true
        })
    },
    LOG_DIR = path.join(process.cwd(), 'logs');

try {
    fs.mkdirSync(LOG_DIR);
}catch (err) {
    err;
}

intel.setLevel('debug');
intel.addHandler(
    new intel.handlers.Console(_.extend({}, baseHandlerConfig))
);

/*
intel.addHandler(
    new intel.handlers.Rotating(_.extend({
        file: path.join(LOG_DIR, 'bse.log'),
        maxSize: 1024 * 1024
    }, baseHandlerConfig))
);
*/

/**
 * Returns logger by it name
 * If first arguments is module then add part of module file path to log string
 * @param {Object} module
 * @returns {*}
 */
function getLogger(module) {
    return intel.getLogger(module ? module.filename.split('/').slice(-2).join('/') : '');
}

/**
 * Alias for logging verbose messages
 * @param {String} str (string) for logging
 * @param {Object} module object
 * @returns {*}
 */
exports.verbose = function (str, module) {
    return getLogger(module).verbose(str);
};

/**
 * Alias for logging debug messages
 * @param {String} str (string) for logging
 * @param {Object} module object
 * @returns {*}
 */
exports.debug = function (str, module) {
    return getLogger(module).debug(str);
};

/**
 * Alias for logging info messages
 * @param {String} str (string) for logging
 * @param {Object} module object
 * @returns {*}
 */
exports.info = function (str, module) {
  return getLogger(module).info(str);
};

/**
 * Alias for logging warn messages
 * @param {String} str (string) for logging
 * @param {Object} module object
 * @returns {*}
 */
exports.warn = function (str, module) {
    return getLogger(module).warn(str);
};

/**
 * Alias for logging error messages
 * @param {String} str (string) for logging
 * @param {Object} module object
 * @returns {*}
 */
exports.error = function (str, module) {
    return getLogger(module).error(str);
};
