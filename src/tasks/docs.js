'use strict';

var util = require('util'),

    _ = require('lodash'),
    vow = require('vow'),

    logger = require('../logger'),
    renderer = require('../renderer'),
    githubApi = require('../gh-api'),
    levelDb = require('../level-db'),
    utility = require('../util');

/**
 * Loads docs from database by docs prefix
 * @param {TargetBase} target object
 * @returns {*}
 */
function getDocsFromDb(target) {
    return levelDb.getByCriteria(function(record) {
        return record.key.indexOf(target.KEY.DOCS_PREFIX) > -1;
    });
}

/**
 * Loads docs from remote repository by github API
 * @param {Object} value from database
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
 * @param {TargetBase} target object
 * @param {Object} record loaded from database
 * @returns {*}
 */
function syncDoc(target, record) {
    var key = record.key,
        value = record.value;
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
                target.getChanges().getDocs().addAdded({ url: value.content });
            } else {
                logger.debug(util.format('Document was modified: %s', getTitle(value)), module);
                target.getChanges().getDocs().addModified({ title: getTitle(value), url: value.url });
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
 * @param {TargetBase} target object
 * @param {Array} records loaded from database
 * @returns {*}
 */
function syncDocs(target, records) {
    return vow.allResolved(records.map(function(item) {
        return syncDoc(item, target);
    }));
}

module.exports = function(target) {
    return getDocsFromDb(target)
        .then(function(records) {
            return syncDocs(target, records);
        })
        .then(function() {
            logger.info('Docs were synchronized successfully', module);
            return vow.resolve(target);
        })
        .fail(function(err) {
            logger.error(util.format('Docs synchronization failed with error %s', err.message), module);
            return vow.reject(err);
        });
};
