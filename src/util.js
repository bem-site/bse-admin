var u = require('util'),
    _ = require('lodash'),
    vow = require('vow'),
    md = require('marked'),
    fsExtra = require('fs-extra'),
    errors = require('./errors').Util;

/**
 * Returns array of available languages
 * @returns {Array}
 */
exports.getLanguages = function () {
    return ['en', 'ru'];
};

/**
 * Recurcively removes given folder with all nested files and folders
 * @param {String} p - path to folder
 * @returns {*}
 */
exports.removeDir = function (p) {
    var def = vow.defer();
    fsExtra.remove(p, function (err) {
        if (err) {
            errors.createError(errors.CODES.REMOVE_DIR, { err: err }).log();
            def.reject(err);
        } else {
            def.resolve();
        }
    });
    return def.promise();
};

/**
 * Copy all files from source folder to target folder
 * @param {String} source - path to source folder
 * @param {String} target - path to target folder
 * @returns {*}
 */
exports.copyDir = function (source, target) {
    var def = vow.defer();
    fsExtra.copy(source, target, function (err) {
        if (err) {
            errors.createError(errors.CODES.COPY_DIR, { err: err }).log();
            def.reject(err);
        } else {
            def.resolve();
        }
    });
    return def.promise();
};

/**
 * Compile *.md files to html with marked module
 * @param {String} content of *.md file
 * @param {Object} conf - configuration object
 * @returns {String} html string
 */
exports.mdToHtml = function (content, conf) {
    return md(content, _.extend({
        gfm: true,
        pedantic: false,
        sanitize: false
    }, conf));
};

/**
 * Return compiled date in milliseconds from date in dd-mm-yyyy format
 * @param  {String} dateStr - staring date in dd-mm-yyy format
 * @return {Number} date in milliseconds
 */
exports.dateToMilliseconds = function (dateStr) {
    var re = /[^\w]+|_+/,
        date = new Date(),
        dateParse = dateStr.split(re),
        dateMaskFrom = 'dd-mm-yyyy'.split(re);

    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);

    dateMaskFrom.forEach(function (elem, indx) {
        switch (elem) {
            case 'dd':
                date.setDate(dateParse[indx]);
                break;
            case 'mm':
                date.setMonth(dateParse[indx] - 1);
                break;
            default:
                if (dateParse[indx].length === 2) {
                    if (date.getFullYear() % 100 >= dateParse[indx]) {
                        date.setFullYear('20' + dateParse[indx]);
                    }else {
                        date.setFullYear('19' + dateParse[indx]);
                    }
                }else {
                    date.setFullYear(dateParse[indx]);
                }
        }
    });

    return date.valueOf();
};

/**
 * Separates array into small array with given chunkSize length
 * @param {Array} arr - array for separate
 * @param {Number} chunkSize - size of chunk
 * @returns {Array}
 */
exports.separateArrayOnChunks = function (arr, chunkSize) {
    var _arr = arr.slice(0),
        arrays = [];

    while (_arr.length > 0) {
        arrays.push(_arr.splice(0, chunkSize));
    }

    return arrays;
};

/**
 * Generates name of snapshot
 * @returns {String}
 */
exports.getSnapshotName = function () {
    var date = new Date();
    return u.format('%s:%s:%s-%s:%s:%s',
        date.getDate(),
        date.getMonth() + 1,
        date.getFullYear(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds()
    );
};
