var util = require('util'),
    fs = require('fs'),
    zlib = require('zlib'),

    _ = require('lodash'),
    vow = require('vow'),
    md = require('marked'),
    request = require('request'),
    fsExtra = require('fs-extra'),

    logger = require('./logger'),
    config = require('./config');

/**
 * Returns array of available languages
 * @returns {Array}
 */
exports.getLanguages = function () {
    return config.get('languages') || [config.get('defaultLanguage') || 'en'];
};

/**
 * Recurcively removes given folder with all nested files and folders
 * @param {String} p - path to folder
 * @returns {*}
 */
exports.removeDir = function (p) {
    var def = vow.defer();
    fsExtra.remove(p, function (err) {
        err ? def.reject(err) : def.resolve();
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
        err ? def.reject(err) : def.resolve();
    });
    return def.promise();
};

/**
 * Loads data from gh to file on local filesystem via https request
 * @param {Object} options
 * @returns {*}
 */
exports.loadFromRepoToFile = function (options) {
    var def = vow.defer(),
        repo = options.repository,
        file = options.file,
        getUrl = function (type) {
            return {
                'public': 'https://raw.githubusercontent.com/%s/%s/%s/%s',
                'private': 'https://github.yandex-team.ru/%s/%s/raw/%s/%s'
            }[type];
        },
        url = util.format(getUrl(repo.type), repo.user, repo.repo, repo.ref, repo.path);

    request.get(url).pipe(fs.createWriteStream(file))
        .on('error', function (err) {
            logger.error(util.format('Error occur while loading from url %s to file %s', url, file), module);
            def.reject(err);
        })
        .on('close', function () {
            logger.debug(util.format('Success loading from url %s to file %s', url, file), module);
            def.resolve();
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
