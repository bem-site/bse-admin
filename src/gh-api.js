'use strict';

var util = require('util'),

    _ = require('lodash'),
    vow = require('vow'),
    Api = require('github'),

    errors = require('./errors').GhApi,
    config = require('./config'),
    logger = require('./logger'),

    gitPublic,
    gitPrivate,
    common = {
        version: '3.0.0',
        protocol: 'https',
        timeout: 5000,
        debug: false
    },
    isInitialized = false;

function _initPrivate () {
    var ghConfig = config.get('github'),
        ghPrivate = ghConfig.private || {},
        conf = {
            host: ghPrivate.host || 'github.yandex-team.ru',
            pathPrefix: ghPrivate.pathPrefix || '/api/v3'
        };

    if (Object.keys(ghPrivate).length) {
        gitPrivate = new Api(_.extend(conf, common));
    }
}

function _initPublic () {
    var ghConfig = config.get('github'),
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
     * with configured credentials
     */
    init: function () {
        if (isInitialized) {
            return vow.resolve();
        }

        logger.info('Initialize github API module', module);

        _initPublic();
        _initPrivate();

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
     * - type {String} type of repository privacy ('public' or 'private')
     * - user {String} name of user or organization which this repository is belong to
     * - repo {String} name of repository
     * - ref {String} name of branch
     * - path {String} relative path from the root of repository
     * @returns {*}
     */
    load: function (options) {
        var def = vow.defer(),
            repository = options.repository;
        logger.verbose(util.format('Load data from %s %s %s %s',
            repository.user, repository.repo, repository.ref, repository.path), module);

        this.getGit(repository).repos.getContent(repository, function (err, res) {
            if (err || !res) {
                logger.error(util.format('Load data from %s %s %s %s',
                    repository.user, repository.repo, repository.ref, repository.path), module);
                errors.createError(errors.CODES.LOAD, {
                    path: repository.path,
                    user: repository.user,
                    repo: repository.repo,
                    ref: repository.ref,
                    err: err
                }).log();
                def.reject({ res: null, repo: repository });
            }else {
                def.resolve({ res: res, repo: repository });
            }
        });
        return def.promise();
    },

    /**
     * Returns info for given branch
     * @param {Object} options - object with fields:
     * - type {String} type of repository privacy ('public' or 'private')
     * - user {String} name of user or organization which this repository is belong to
     * - repo {String} name of repository
     * - branch {String} name of branch
     * @returns {*}
     */
    isBranchExists: function (options) {
        var def = vow.defer(),
            repository = options.repository;

        this.getGit(repository).repos.getBranch(repository, function (err, res) {
            if (err || !res) {
                if (err.code !== 404) {
                    errors.createError(errors.CODES.IS_BRANCH_EXISTS, {
                        user: repository.user,
                        repo: repository.repo,
                        branch: repository.branch,
                        err: err.message
                    }).log('warn');
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
     * - type {String} type of repository privacy ('public' or 'private')
     * - user {String} name of user or organization which this repository is belong to
     * - repo {String} name of repository
     * - path {String} relative path from the root of repository
     * @returns {*}
     */
    getCommits: function (options) {
        var def = vow.defer(),
            repository = options.repository;

        this.getGit(repository).repos.getCommits(repository, function (err, res) {
            if (err || !res) {
                errors.createError(errors.CODES.GET_COMMITS, {
                    user: repository.user,
                    repo: repository.repo,
                    branch: repository.path,
                    err: err
                }).log();
            }
            def.resolve(res);
        });

        return def.promise();
    },

    /**
     * Returns name of default branch for current repository
     * @param {Object} options - object with fields:
     * - type {String} type of repository privacy ('public' or 'private')
     * - user {String} name of user or organization which this repository is belong to
     * - repo {String} name of repository
     * @returns {*}
     */
    getDefaultBranch: function (options) {
        var def = vow.defer(),
            repository = options.repository;

        this.getGit(repository).repos.get(repository, function (err, res) {
            if (err || !res) {
                errors.createError(errors.CODES.GET_DEFAULT_BRANCH, {
                    user: repository.user,
                    repo: repository.repo,
                    err: err
                }).log();
                def.resolve(null);
            }else {
                def.resolve(res['default_branch']);
            }
        });
        return def.promise();
    }
};
