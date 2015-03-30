var util = require('util'),
    path = require('path'),

    _ = require('lodash'),
    vow = require('vow'),

    levelDb = require('../providers/level-db'),
    utility = require('../util'),
    logger = require('../logger'),

    REGEXP = {
    HREF: /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/g, // <a href="...">
    SRC: /<img\s+(?:[^>]*?\s+)?src="([^"]*)"/g, // <img src="...">
    RELATIVE: {
        DOC: /^\.?\/?([\w|-]+)\.?[md|html|ru\.md|en\.md]?/,
        VERSION_DOC: /^\.?\/?(\d+\.\d+\.\d+)\-([\w|-]+)?\.?[md|html|ru\.md|en\.md]?/,
        BLOCK: /^\.\.?\/([\w|-]+)\/?([\w|-]+)?\.?[md|html|ru\.md|en\.md]?/,
        BLOCKS: /^\.?\/?([\w|-]+)\.blocks\/([\w|-]+)\/?([\w|-]+)?\.?[md|html|ru\.md|en\.md]?/,
        LEVEL: /^\.\.?\/\.\.\/([\w|-]+)\.blocks\/([\w|-]+)\/?([\w|-]+)?\.?[md|html|ru\.md|en\.md]?/
    }
};

function buildHref(a) {
    return util.format('<a href="%s"', a);
}

/**
 * Check if link is e-mail link
 * @param {String} str link
 * @returns {boolean}
 */
function isMailTo(str) {
    return /^mailto:/.test(str);
}

/**
 * Check if link is simple anchor link
 * @param {String} str link
 * @returns {boolean}
 */
function isAnchor(str) {
    return /^#(.+)?/.test(str);
}

function isAbsolute(str) {
    return /^(https?:)?\/\//.test(str);
}

/**
 * Check if link is simple anchor link
 * @param {String} str link
 * @param {Array} links that are exists in site model
 * @returns {boolean}
 */
function isNativeSiteLink(str, links) {
    return links.indexOf(str.replace(/\/$/, '')) > -1;
}

/**
 * Replace kind of broken links
 * @param {String} str link
 * @returns {String}
 */
function fixBrokenLinkWithAmpersand(str) {
    return str.replace(/^&$/, '');
}

/**
 * Replace kind of broken links
 * @param {String} str link
 * @returns {String}
 */
function fixBrokenLinkWithBracket(str) {
    return str.replace(/^\(/, '');
}

/**
 * Fix broken github links
 * @param {String} str link
 * @returns {*}
 */
function fixGithubLinks(str) {
    str = (/^github\.com/.test(str) ? 'https://' : '') + str;
    return str.replace(/^\/\/github/, 'https://github');
}

/**
 * Try to build full github link by relative github link
 * @param {String} str link
 * @param {BaseNode} node
 * @param {String} lang language
 * @param {String} treeOrBlob - 'tree' or 'blob'
 * @returns {*}
 */

function buildFullGithubLinkForDocs(str, doc, lang, treeOrBlob) {
    if (doc && doc.repo) {
        var repo = doc.repo;
        return 'https://' + path.join(repo.host, repo.user, repo.repo, treeOrBlob, repo.ref,
                str.indexOf('.') === 0 ? path.dirname(repo.path) : '', str.replace(/^\//, ''));
    }
    return str;
}

/**
 * Try to recognize different relative links for library embedded docs
 * @param {String} str link
 * @param {BaseNode} node
 * @returns {*}
 */
function recognizeRelativeLinkForLibraryDocs(str, node) {
    var conditions, lib, version, match;

    conditions = node.route.conditions;
    if (!conditions) {
        return [str];
    }

    lib = conditions.lib;
    version = conditions.version;

    if (!lib || !version) {
        return [str];
    }

    // common.blocks/button/button.ru.md
    match = str.match(REGEXP.RELATIVE.BLOCKS);
    if (match) {
        return ['desktop', 'touch-pad', 'touch-phone'].reduce(function (prev, item) {
            prev.push(util.format('/libs/%s/%s/%s/%s', lib, version, item, match[2]));
            return prev;
        }, []);
    }

    // 3.1.0-changelog.md
    match = str.match(REGEXP.RELATIVE.VERSION_DOC);
    if (match) {
        return [util.format('/libs/%s/v%s/%s', lib, match[1], match[2])];
    }

    // ./changelog
    match = str.match(REGEXP.RELATIVE.DOC);
    if (match) {
        match[1] = match[1].toLowerCase();
        return match[1] === 'readme' ?
            [util.format('/libs/%s/%s', lib, version)] :
            [util.format('/libs/%s/%s/%s', lib, version, match[1])];
    }
    return [str];
}

/**
 * Try to build full github link to image by relative github link
 * @param {String} href link
 * @param {BaseNode} doc node
 * @returns {*}
 */
function buildSrcForImages(href, doc) {
    var docParentUrl = doc.url.replace(/\/\w*\.md/, '/') || ''; // replace last url's part: repo/docs/a.md -> repo/docs

    return href = docParentUrl + href + '?raw=true';
}

/**
 * Recognize links for blocks that are on the same level with current block
 * @param {String} str link
 * @param {BlockNode} node of library block
 * @returns {*}
 */
function recognizeRelativeBlockLinkOnSameLevel(str, node) {
    var conditions = node.route.conditions,
        lib = conditions.lib,
        version = conditions.version,
        level = conditions.level,
        match = str.match(REGEXP.RELATIVE.BLOCK);

    if (match) {
        return util.format('/libs/%s/%s/%s/%s', lib, version, level, match[1]);
    }
    return str;
}

/**
 * Recognize links for blocks that are on different level from current block
 * @param {String} str link
 * @param {BlockNode} node of library block
 * @returns {*}
 */
function recognizeRelativeBlockLinkOnDifferentLevels(str, node) {
    var conditions = node.route.conditions,
        lib = conditions.lib,
        version = conditions.version,
        match = str.match(REGEXP.RELATIVE.LEVEL);

    if (match) {
        return util.format('/libs/%s/%s/%s/%s', lib, version, match[1], match[2]);
    }
    return str;
}

/**
 * Override links for doc sources
 * @param {String} content doc node
 * @param {BaseNode} node - doc node
 * @param {Object} urlHash - hash with existed urls
 * @param {String} lang - language
 */
function overrideLinks(content, node, urlHash, lang, doc) {
    if (!_.isString(content)) {
        return content;
    }

    content = content.replace(REGEXP.SRC, function(str, href){
        //if href is absolute (src="http://..." ) return href
        href = /^http/.test(href) ? href : buildSrcForImages(href, doc);
        return '<img src="' + href + '"';
    });

    content = content.replace(REGEXP.HREF, function (str, href) {
        // decode html entities
        href = href.replace(/&#(x?)([0-9a-fA-F]+);?/g, function (str, bs, match) {
            return String.fromCharCode(parseInt(match, bs === 'x' ? 16 : 10));
        });

        var existedLinks = _.values(urlHash);
            // nativeHref = href;

        if (isMailTo(href) || isAnchor(href)) {
            return buildHref(href);
        }

        href = fixBrokenLinkWithAmpersand(href);
        href = fixBrokenLinkWithBracket(href);
        href = fixGithubLinks(href);

        var hrefArr = href.split('#'), // extrude anchor from link
            anchor = hrefArr[1],
            links = [],
            replaced;

        href = hrefArr[0];

        if (isNativeSiteLink(href, existedLinks)) {
            return buildHref(href + (anchor ? '#' + anchor : ''));
        }

        // try to recognize
        if (isAbsolute(href)) {
            links.push(href.replace(/\/tree\//, '/blob/'));
            links.push(href.replace(/\/blob\//, '/tree/'));
        } else {
            links.push(buildFullGithubLinkForDocs(href, doc, lang, 'tree'));
            links.push(buildFullGithubLinkForDocs(href, doc, lang, 'blob'));
            links = links.concat(recognizeRelativeLinkForLibraryDocs(href, node));
            if (node.source && node.source.data) {
                links.push(recognizeRelativeBlockLinkOnSameLevel(href, node));
                links.push(recognizeRelativeBlockLinkOnDifferentLevels(href, node));
            }
        }

        links.some(function (item) {
            if (urlHash[item]) {
                replaced = urlHash[item];
                return true;
            }
            if (urlHash[item + '/README.md']) {
                replaced = urlHash[item + '/README.md'];
                return true;
            }
            if (existedLinks.indexOf(item) > -1) {
                replaced = item;
                return true;
            }
            return false;
        });

        if (replaced) {
            href = replaced;
        }else if (!isAbsolute(href)) {
            href = links[0];
        }

        href += (anchor ? '#' + anchor : '');
        // if (nativeHref.match(/^.\//)) {
        //    logger.debug(util.format('native: %s replaced: %s', nativeHref, href), module);
        // }
        return buildHref(href);
    });

    return content;
}

function collectUrls(target) {
    function getDocByNodeId(arr, id, lang) {
        return _.find(arr, function (item) {
            return item.key === util.format('%s%s:%s', target.KEY.DOCS_PREFIX, id, lang);
        });
    }

    return vow.all([
        levelDb.get().getByKeyRange(target.KEY.NODE_PREFIX, target.KEY.PEOPLE_PREFIX),
        levelDb.get().getByKeyRange(target.KEY.DOCS_PREFIX, target.KEY.NODE_PREFIX)
   ]).spread(function (nodeRecords, docRecords) {
        return nodeRecords.reduce(function (prev, nodeRecord) {
            var nodeValue = nodeRecord.value,
                doc;

            utility.getLanguages().forEach(function (lang) {
                if (!nodeValue.hidden[lang]) {
                    doc = getDocByNodeId(docRecords, nodeValue.id, lang);
                    if (doc && doc.value.url) {
                        prev[doc.value.url] = nodeValue.url;
                    } else {
                        prev[nodeValue.id] = nodeValue.url;
                    }
                }
            });
            return prev;
        }, {});
    });
}

module.exports = function (target) {
    logger.info('Start overriding links', module);

    if (!target.getChanges().areModified()) {
        logger.warn('No changes were made during this synchronization. This step will be skipped', module);
        return vow.resolve(target);
    }

    var languages = utility.getLanguages();
    return vow.all([
            levelDb.get().getByKeyRange(target.KEY.NODE_PREFIX, target.KEY.PEOPLE_PREFIX),
            collectUrls(target)
       ])
        .spread(function (nodeRecords, urlsHash) {
            return vow.all(nodeRecords.map(function (nodeRecord) {
                var nodeValue = nodeRecord.value;

                if (nodeValue.source && nodeValue.source.data) {
                    return levelDb.get().get(nodeValue.source.data).then(function (blockValue) {
                        if (!blockValue) {
                            return vow.resolve();
                        }

                        languages.forEach(function (lang) {
                            var description = blockValue[lang] ? blockValue[lang].description : blockValue.description;
                            if (!description) {
                                // logger.warn('there no description in block data for key %s', source.key);
                                return;
                            }

                            if (_.isArray(description)) {
                                // old bem-sets format
                                description.forEach(function (item, index) {
                                    if (blockValue[lang]) {
                                        blockValue[lang].description[index].content =
                                            overrideLinks(item.content || '', nodeValue, urlsHash, lang);
                                    } else {
                                        blockValue.description[index].content =
                                            overrideLinks(item.content || '', nodeValue, urlsHash, lang);
                                    }
                                });
                            } else {
                                if (blockValue[lang]) {
                                    blockValue[lang].description =
                                        overrideLinks(description, nodeValue, urlsHash, lang);
                                } else {
                                    blockValue.description =
                                        overrideLinks(description, nodeValue, urlsHash, lang);
                                }
                            }
                        });

                        return levelDb.get().put(nodeValue.source.data, blockValue);
                    });
                }

                return vow.all(languages.map(function (lang) {
                    var docKey = util.format('%s%s:%s', target.KEY.DOCS_PREFIX, nodeValue.id, lang);
                    return levelDb.get().get(docKey)
                        .then(function (docValue) {
                            if (!docValue || !docValue.content) {
                                return vow.resolve();
                            }
                            docValue.content = overrideLinks(docValue.content, nodeValue, urlsHash, lang, docValue);
                            return levelDb.get().put(docKey, docValue);
                        });
                }));
            }));
        })
        .then(function () {
            logger.info('Links were successfully overrided', module);
            return vow.resolve(target);
        })
        .fail(function (err) {
            logger.error(
                util.format('Overriding links failed with error %s', err.message), module);
            return vow.reject(err);
        });
};
