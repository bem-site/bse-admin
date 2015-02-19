'use strict';

var util = require('util'),

    _ = require('lodash'),
    vow = require('vow'),
    Api = require('github'),

    errors = require('../errors').GhApi,
    logger = require('../logger'),

    gitPublic,
    gitPrivate,
    common = {
        version: '3.0.0',
        protocol: 'https',
        timeout: 60000,
        debug: false
    },
    isInitialized = false;

function _initPrivate (options) {
    var ghConfig = options,
        ghPrivate = ghConfig.private || {},
        conf = {
            host: ghPrivate.host || 'github.yandex-team.ru',
            pathPrefix: ghPrivate.pathPrefix || '/api/v3'
        };

    if (Object.keys(ghPrivate).length) {
        gitPrivate = new Api(_.extend(conf, common));
    }
}

function _initPublic (options) {
    var ghConfig = options,
        ghPublic = ghConfig.public || {},
        conf = {
            host: ghPublic.host || 'api.github.com'
        };

    if (Object.keys(ghPublic).length) {
        var tokens = _.isArray(ghPublic.token) ? ghPublic.token : [ghPublic.token];

        gitPublic = [];
        tokens.forEach(function (item) {
            var gp = new Api(_.extend(conf, common));
            if (item.length) {
                gp.authenticate({ type: 'oauth', token: item });
            } else {
                errors.createError(errors.CODES.NOT_AUTHENTIFICATED).log('warn');
            }

            logger.debug(util.format('Initialize public ghAPI for token %s', item), module);
            gitPublic.push(gp);
        });
    }
}

module.exports = {
    /**
     * Initialize github api connections to public and private repositories
     * @param {Object} options for github api initialization
     * with configured credentials
     */
    init: function (options) {
        if (isInitialized) {
            return vow.resolve();
        }

        logger.info('Initialize github API module', module);

        _initPublic(options);
        _initPrivate(options);

        isInitialized = true;
        return vow.resolve();
    },

    /**
     * Returns gh module configured for public or private github depending on repository type
     * @param {Object} r -  repository configuration object
     * @returns {Object}
     */
    getGit: function (r) {
        return r.type === 'private' ? gitPrivate : _.sample(gitPublic);
    },

    /**
     * Returns content of repository directory or file loaded by github api
     * @param {Object} options - object with fields:
     * - {Object} repository:
     *    - type {String} type of repository privacy ('public' or 'private')
     *    - user {String} name of user or organization which this repository is belong to
     *    - repo {String} name of repository
     *    - ref {String} name of branch
     *    - path {String} relative path from the root of repository
     * - {Object} headers - optional header params
     * @returns {*}
     */
    load: function (options) {
        var def = vow.defer(),
            ch = options.headers,
            cr = options.repository,
            c = _.extend({}, cr, ch ? { headers: ch } : {});

        logger.verbose(util.format('Load data from %s %s %s %s', cr.user, cr.repo, cr.ref, cr.path), module);

        this.getGit(cr).repos.getContent(c, function (err, res) {
            if (err || !res) {
                logger.warn(util.format('Load data from %s %s %s %s failed',
                    cr.user, cr.repo, cr.ref, cr.path), module);
                def.reject({ res: null, repo: cr });
            }else {
                def.resolve({ res: res, repo: cr });
            }
        });
        return def.promise();
    },

    /**
     * Returns info for given branch
     * @param {Object} options - object with fields:
     * - {Object} repository:
     *    - type {String} type of repository privacy ('public' or 'private')
     *    - user {String} name of user or organization which this repository is belong to
     *    - repo {String} name of repository
     *    - branch {String} name of branch
     * - {Object} headers - optional header params
     * @returns {*}
     */
    isBranchExists: function (options) {
        var def = vow.defer(),
            ch = options.headers,
            cr = options.repository,
            c = _.extend({}, cr, ch ? { headers: ch } : {});

        this.getGit(cr).repos.getBranch(c, function (err, res) {
            if (err || !res) {
                if (err.code !== 404) {
                    errors.createError(errors.CODES.IS_BRANCH_EXISTS,
                        { user: cr.user, repo: cr.repo, branch: cr.branch, err: err.message }).log('warn');
                }
                def.resolve(false);
            }else {
                def.resolve(true);
            }
        });

        return def.promise();
    },

    /**
     * Returns list of commits of given file path
     * @param {Object} options - object with fields:
     * - {Object} repository:
     *    - type {String} type of repository privacy ('public' or 'private')
     *    - user {String} name of user or organization which this repository is belong to
     *    - repo {String} name of repository
     *    - path {String} relative path from the root of repository
     * - {Object} headers - optional header params
     * @returns {*}
     */
    getCommits: function (options) {
        var def = vow.defer(),
            ch = options.headers,
            cr = options.repository,
            c = _.extend({}, cr, ch ? { headers: ch } : {});

        this.getGit(cr).repos.getCommits(c, function (err, res) {
            if (err || !res) {
                errors.createError(errors.CODES.GET_COMMITS,
                    { user: cr.user, repo: cr.repo, branch: cr.path, err: err }).log();
            }
            def.resolve(res);
        });

        return def.promise();
    },

    /**
     * Returns name of default branch for current repository
     * @param {Object} options - object with fields:
     * - {Object} repository:
     *    - type {String} type of repository privacy ('public' or 'private')
     *    - user {String} name of user or organization which this repository is belong to
     *    - repo {String} name of repository
     * - {Object} headers - optional header params
     * @returns {*}
     */
    getDefaultBranch: function (options) {
        var def = vow.defer(),
            ch = options.headers,
            cr = options.repository,
            c = _.extend({}, cr, ch ? { headers: ch } : {});

        this.getGit(cr).repos.get(c, function (err, res) {
            if (err || !res) {
                errors.createError(errors.CODES.GET_DEFAULT_BRANCH,
                    { user: cr.user, repo: cr.repo, err: err }).log();
                def.resolve(null);
            }else {
                def.resolve(res['default_branch']);
            }
        });
        return def.promise();
    }
};
