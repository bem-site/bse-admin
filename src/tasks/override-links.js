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
            DOC: /^\.?\/?(?:\.\.\/)+?([\w|-]+)\.?[md|html|ru\.md|en\.md]?/,
            VERSION_DOC: /^\.?\/?(\d+\.\d+\.\d+)\-([\w|-]+)?\.?[md|html|ru\.md|en\.md]?/,
            BLOCK: /^\.\.?\/([\w|-]+)\/?([\w|-]+)?\.?[md|html|ru\.md|en\.md]?/,
            BLOCKS: /^\.?\/?(?:\.\.\/)?([\w|-]+)\.blocks\/([\w|-]+)\/?([\w|-]+)?\.[md|html|ru\.md|en\.md]/,
            LEVEL: /^\.\.?\/\.\.\/([\w|-]+)\.blocks\/([\w|-]+)\/?([\w|-]+)?\.?[md|html|ru\.md|en\.md]?/,
            BLOCK_FILES: /^\.?\/?(?:\.\.\/)?([\w|-]+)\.blocks\/([\w|-]+)\/?([\w|-]+)?\.(?![md|html|ru\.md|en\.md])/,
            JSON: /\w+\.json/
        }
    },
    PORTION_SIZE = 100;

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
 * @param {String} doc document
 * @param {String} treeOrBlob - 'tree' or 'blob'
 * @param {BaseNode} node
 * @returns {*}
 */

function buildFullGithubLinkForDocs(str, doc, treeOrBlob, node) {
    var jsonMatch = str.match(REGEXP.RELATIVE.JSON);

    if (doc && doc.repo) {
        var repo = doc.repo;
        return 'https://' + path.join(repo.host, repo.user, repo.repo, treeOrBlob, repo.ref,
                str.indexOf('.') === 0 ? path.dirname(repo.path) : '', str.replace(/^\//, ''));
    } else if (jsonMatch) {
        var ghLibVersionUrl = node.ghLibVersionUrl,
            version = node.route.conditions.version;

        return [ghLibVersionUrl, treeOrBlob, version, jsonMatch[0]].join('/');
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

    // ../../popup/popup.js
    match = str.match(REGEXP.RELATIVE.BLOCK_FILES);
    if (match) {
        return node.ghLibVersionUrl + '/blob/' + version + str;
    }

    return [str];
}

/**
 * Try to build full github link to image by relative github link
 * @param {String} href link
 * @param {BaseNode} doc node
 * @returns {*}
 */
function buildSrcForImages(str, href, doc, node) {
    var docParentUrl = doc && doc.url.replace(/\/\w*\.md/, '/'), // replace last url's part: repo/docs/a.md -> repo/docs
        absoluteLink = node.ghLibVersionUrl + '/blob/' + node.route.conditions.version,
        src = (doc ? docParentUrl : absoluteLink) + href;

    // change only src, save styles and attrs
    return str.replace(/src=("|')?.+("|')?/g, 'src="' + src + '?raw=true"')
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
        return /^http/.test(href) ? str : buildSrcForImages(str, href, doc, node);
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
            if(href.match(REGEXP.RELATIVE.JSON) || doc && doc.repo) {
                links.push(buildFullGithubLinkForDocs(href, doc, 'tree', node));
                links.push(buildFullGithubLinkForDocs(href, doc, 'blob', node));
            }
            links = links.concat(recognizeRelativeLinkForLibraryDocs(href, node));
            if (node.source && node.source.data) {
                links.push(recognizeRelativeBlockLinkOnSameLevel(href, node));
            }
            links.push(recognizeRelativeBlockLinkOnDifferentLevels(href, node));
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

/**
 * Creates url hash for resolve links
 * @param {TargetBase} target object
 * @returns {Promise}
 */
function collectUrls(target) {
    /**
     * Выбираем все записи документов (обычные посты и документация библиотек)
     * Фильтруем записи документов по критерию наличия url - адреса документа на github
     * и строим hash соответствия ключа записи - url
     * Загружаем все записи из пространства ключей NODE
     * строим итоговый хэш в котором значениями являются урлы страниц на сайте
     * а ключами урлы на гитхабе или id записей в случае блоков или отсутствия соответствий
     * url github -> site url
     */
    return levelDb.get().getByKeyRange(target.KEY.DOCS_PREFIX, target.KEY.NODE_PREFIX)
        .then(function (docRecords) {
            return vow.all([
                levelDb.get().getByKeyRange(target.KEY.NODE_PREFIX, target.KEY.PEOPLE_PREFIX),
                docRecords
                    .filter(function (record) {
                        return record.value.url;
                    })
                    .reduce(function (prev, record) {
                        prev[record.key] = record.value.url;
                        return prev;
                    }, {})
            ]);
        })
        .spread(function (nodeRecords, docUrlsHash) {
            return nodeRecords.reduce(function (prev, nodeRecord) {
                var nodeValue = nodeRecord.value;

                utility.getLanguages().forEach(function (lang) {
                    if (!nodeValue.hidden[lang]) {
                        var docUrl = docUrlsHash[util.format('%s%s:%s', target.KEY.DOCS_PREFIX, nodeValue.id, lang)];
                        if (docUrl) {
                            prev[docUrl] = nodeValue.url;
                        } else {
                            prev[nodeValue.id] = nodeValue.url;
                        }
                    }
                });
                return prev;
            }, {});
        });
}

/**
 * Reads document page records from db
 * @param {TargetBase} target object
 * @param {Object[]} changedLibVersions - array with changed library versions
 * @returns {Promise}
 */
function getDocumentRecordsFromDb (target, changedLibVersions) {
    /**
     * Здесь происходит выборка из пространства ключей NODE
     * по критериям:
     *
     * 1. view страницы должно быть 'post'
     * 2. Если это документ версии библиотеки, то версия библиотеки должна быть в модели измененных
     */
    return levelDb.get().getByCriteria(function (record) {
        var value = record.value,
            route = value.route,
            conditions, lib, version;

        if (value.view !== 'post') {
            return false;
        }

        conditions = route.conditions;
        if (conditions && conditions.lib && conditions.version) {
            lib = conditions.lib;
            version = conditions.version;

            return changedLibVersions.some(function (item) {
                return item.lib === lib && item.version === version;
            });
        }

        return true;
    }, { gte: target.KEY.NODE_PREFIX, lt: target.KEY.PEOPLE_PREFIX, fillCache: true });
}

/**
 * Reads block pages from database
 * @param {TargetBase} target object
 * @param {Object[]} changedLibVersions - array with changed library versions
 * @returns {Promise}
 */
function getBlockRecordsFromDb(target, changedLibVersions) {
  /**
   * Здесь происходит выборка из пространства ключей NODE
   * по критериям:
   *
   * 1. view страницы должно быть 'block'
   * 2. Должен быть source.data - ссылка на запись с документацией блока
   * 3. Версия библиотеки должна быть в модели измененных
   */
    return levelDb.get().getByCriteria(function (record) {
        var value = record.value,
            route = value.route,
            conditions, lib, version;

        if (value.view !== 'block') {
            return false;
        }

        if (!value.source || !value.source.data) {
            return false;
        }

        conditions = route.conditions;
        if (conditions && conditions.lib && conditions.version) {
            lib = conditions.lib;
            version = conditions.version;

            return changedLibVersions.some(function (item) {
                return item.lib === lib && item.version === version;
            });
        }

        return false;
    }, { gte: target.KEY.NODE_PREFIX, lt: target.KEY.PEOPLE_PREFIX, fillCache: true });
}

/**
 * Overrides links for document page records
 * @param {TargetBase} target object
 * @param {Object} urlsHash - url comparison hash
 * @param {String []} languages - array of language identifiers
 * @param {Object[]} changedLibVersions - array with changed library versions
 * @returns {Promise}
 */
function overrideLinksInDocuments (target, urlsHash, languages, changedLibVersions) {
    logger.debug('Start to override links in documents', module);

    /**
     * 1. Выбираем страницы документов из бд
     * 2. Делим массив полученных записей на массивы по 100 штук
     * 3. Последовательно выполняем переопределение ссылок для каждой порции записей
     * 3.1 Внутри порции переопредление ссылок для записей происходит параллельно
     * 3.2 Для каждой записи страницы выбираем связанную с ней запись документа
     * 3.3 Еслитаковая присутствует, то скармливаем ее content в переопределятор
     * 3.4 Сохраняем запись документа с измененным контентом
     */
    return getDocumentRecordsFromDb(target, changedLibVersions).then(function (records) {
        logger.debug(util.format('Document records count: %s', records.length), module);
        var portionSize = PORTION_SIZE,
            portions = _.chunk(records, portionSize);

        logger.debug(util.format('Document records were divided into %s portions', portions.length), module);

        return portions.reduce(function (prev, item, index) {
            prev = prev.then(function () {
                logger.debug(util.format('override document links in range %s - %s',
                    index * portionSize, (index + 1) * portionSize), module);
                return vow.allResolved(item.map(function (_item) {
                    var nodeValue = _item.value;
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
            });
            return prev;
        }, vow.resolve());
    });
}

/**
 * Overrides links for block page records
 * @param {TargetBase} target object
 * @param {Object} urlsHash - url comparison hash
 * @param {String []} languages - array of language identifiers
 * @param {Object[]} changedLibVersions - array with changed library versions
 * @returns {Promise}
 */
function overrideLinksInBlocks(target, urlsHash, languages, changedLibVersions) {
    logger.debug('Start to override links in blocks', module);

    /**
     * 1. Выбираем страницы блоков из бд
     * 2. Делим массив полученных записей на массивы по 100 штук
     * 3. Последовательно выполняем переопределение ссылок для каждой порции записей
     * 3.1 Внутри порции переопредление ссылок для записей происходит параллельно
     * 3.2 Для каждой записи страницы выбираем связанную с ней запись докуметации блока
     * 3.3 Если таковая присутствует, то скармливаем ее content в переопределятор
     * с учетом различных форматов документации для разных библиотек и наличия нескольких языков
     * 3.4 Сохраняем запись документации блока с измененным контентом
     */
    return getBlockRecordsFromDb(target, changedLibVersions).then(function (records) {
        logger.debug(util.format('Block records count: %s', records.length), module);
        var portionSize = PORTION_SIZE,
            portions = _.chunk(records, portionSize);

        logger.debug(util.format('Block records were divided into %s portions', portions.length), module);

        return portions.reduce(function (prev, item, index) {
            prev = prev.then(function () {
                logger.debug(util.format('override block links in range %s - %s',
                    index * portionSize, (index + 1) * portionSize), module);
                return vow.allResolved(item.map(function (_item) {
                    var nodeValue = _item.value;

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
                }));
            });
            return prev;
        }, vow.resolve());
    });
}

module.exports = function (target) {
    logger.info('Start overriding links', module);

    if (!target.getChanges().areModified()) {
        logger.warn('No changes were made during this synchronization. This step will be skipped', module);
        return vow.resolve(target);
    }

    var languages = utility.getLanguages(),
        librariesChanges = target.getChanges().getLibraries(),
        changedLibVersions = []
            .concat(librariesChanges.getAdded())
            .concat(librariesChanges.getModified()),
        urlsHash;

    return collectUrls(target)
        .then(function (_urlsHash) {
            logger.debug('Urls were collected. Start to process pages ...', module);
            urlsHash = _urlsHash;
            return urlsHash;
        })
        .then(function () {
            return overrideLinksInDocuments(target, urlsHash, languages, changedLibVersions);
        })
        .then(function () {
            return overrideLinksInBlocks(target, urlsHash, languages, changedLibVersions);
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
