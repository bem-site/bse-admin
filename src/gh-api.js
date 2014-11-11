'use strict';

var util = require('util'),

    _ = require('lodash'),
    vow = require('vow'),
    Api = require('github'),

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

        var ghConfig = config.get('github'),
            ghPublic = _.extend({ host: 'api.github.com' }, ghConfig.public || {}),
            ghPrivate = _.extend({ host: 'github.yandex-team.ru', pathPrefix: '/api/v3' }, ghConfig.private || {});

        if (ghPublic) {
            gitPublic = new Api(_.extend(ghPublic, common));

            var token = ghConfig.public.token;
            if (token && token.length) {
                gitPublic.authenticate({ type: 'oauth', token: token });
            }else {
                logger.warn('Github API was not authentificated', module);
            }
        }

        if (ghPrivate) {
            gitPrivate = new Api(_.extend(ghPrivate, common));
        }

        isInitialized = true;
        return vow.resolve();
    },

    /**
     * Returns gh module configured for public or private github depending on repository type
     * @param {Object} r -  repository configuration object
     * @returns {Object}
     */
    getGit: function (r) {
        return r.type === 'private' ? gitPrivate : gitPublic;
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
            def.resolve((err || !res) ? false : true);
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
            def.resolve((err || !res) ? null : res['default_branch']);
        });
        return def.promise();
    }
};
