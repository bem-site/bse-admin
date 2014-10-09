'use strict';

var util = require('util'),

    _ = require('lodash'),
    vow = require('vow'),

    logger = require('../logger'),
    renderer = require('../renderer'),
    githubApi = require('../gh-api'),
    levelDb = require('../level-db'),
    utility = require('../util'),

    KEY = {
        NODE_PREFIX: 'nodes:',
        DOCS_PREFIX: 'docs:'
    },
    BaseSynchronizer = require('./base').BaseSynchronizer,
    DocsSynchronizer = function() {};

/**
 * Loads docs from database by docs prefix
 * @returns {*}
 */
function getDocsFromDb() {
    return levelDb.getByCriteria(function(record) {
        return record.key.indexOf(KEY.DOCS_PREFIX) > -1;
    });
}

/**
 * Loads docs from remote repository by github API
 * @param {Object} record from database
 * @returns {*}
 */
function getRemoteData(value) {
    return githubApi.load({ repository: value.repo });
}

function onError(md, url) {
    var errorMsg = (!md || !md.res) ?
        'markdown from url %s does not exists' :
        'markdown form url %s contains errors';
    errorMsg = util.format(errorMsg, url);
    logger.error(errorMsg, module);
    return vow.reject(errorMsg);
}

/**
 * Returns title from value
 * @param {Object} value - value object from database
 * @returns {*}
 */
function getTitle(value) {
    return value.title;
}

/**
 * Sets update date as date of latest commit
 * @param {Object} value - value object from database
 * @returns {*}
 */
function setUpdateDate(value) {
    var repository = value.repo;
    if(!value.repo) {
        return vow.resolve(value);
    }

    return githubApi.getCommits({
            repository: _.extend(repository, { sha: repository.ref })
        })
        .then(function(res) {
            if(!res || !res[0]) {
                logger.warn(util.format('can not get commits for %s %s %s %s',
                    repository.user, repository.repo, repository.ref, repository.path), module);
                return vow.resolve(value);
            }

            value.editDate = (new Date(res[0].commit.committer.date)).getTime();
            return vow.resolve(value);
        });
}

function checkForBranch(value) {
    var repository = value.repo;

    if(!repository) {
        return vow.resolve(value);
    }

    return githubApi.isBranchExists({
            repository: _.extend(repository, { branch: repository.ref })
        })
        .then(function(exists) {
            if(exists) {
                return vow.resolve(value);
            }

            return githubApi.getDefaultBranch({ repository: repository })
                .then(function(branch) {
                    repository.ref = branch;
                    repository.prose = util.format('http://prose.io/#%s/%s/edit/%s/%s',
                        repository.user, repository.repo, repository.ref, repository.path);

                    value.repo = repository;
                    return vow.resolve(value);
                });
        });
}

/**
 * Synchronize single record
 * @param {Object} record loaded from database
 * @param {Changes} changes model
 * @returns {*}
 */
function syncDoc(record, changes) {
    var key = record.key,
        value = JSON.parse(record.value);
    return getRemoteData(value)
        .then(function(md) {
            var result = md.res,
                remoteSha,
                localSha;

            if (!result || !result.sha || !result.content) {
                return onError(md, value.content);
            }

            remoteSha = result.sha;
            localSha = value.sha;

            if (localSha === remoteSha) {
                return vow.resolve();
            }

            if (!localSha) {
                logger.debug(util.format('New document was added: %s', getTitle(value)), module);
                changes.getDocs().addAdded({ url: value.content });
            } else {
                logger.debug(util.format('Document was modified: %s', getTitle(value)), module);
                changes.getDocs().addModified({ title: getTitle(value), url: value.url });
            }

            try {
                value.sha = result.sha;
                value.url = value.content;
                value.content = utility.mdToHtml(
                    (new Buffer(result.content, 'base64')).toString(), { renderer: renderer.getRenderer() });
            } catch(err) {
                return onError(md);
            }

            return setUpdateDate(value)
                .then(checkForBranch)
                .then(function(value) {
                    return levelDb.put(key, value);
                });
        })
        .fail(function() {
            return onError(record.content);
        });
}

/**
 * Synchronize docs
 * @param {Array} records loaded from database
 * @param {Changes} changes model
 * @returns {*}
 */
function syncDocs(records, changes) {
    return vow.allResolved(records.map(function(item) {
        return syncDoc(item, changes);
    }));
}

DocsSynchronizer.prototype = Object.create(BaseSynchronizer.prototype);
DocsSynchronizer.prototype._execute = function(changes) {
    return getDocsFromDb()
        .then(function(records) {
            return syncDocs(records, changes);
        })
        .then(function() {
            logger.info('Docs were synchronized successfully', module);
        })
        .fail(function(err) {
            logger.error(util.format('Docs synchronization failed with error %s', err.message), module);
        });
};

exports.DocsSynchronizer = DocsSynchronizer;
