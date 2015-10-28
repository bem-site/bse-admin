var Util = require('util'),
    Path = require('path'),
    Url = require('url'),

    _ = require('lodash'),
    vow = require('vow'),

    levelDb = require('../providers/level-db'),
    utility = require('../util'),
    logger = require('../logger'),
    PORTION_SIZE = 100;

module.exports = {
    replaceImageSources: function (content, node, doc) {
        var baseVersionGhUrl = node.ghLibVersionUrl + '/blob/' + node.route.conditions.version,
            buildReplace = function (str, src) {
                return str.replace(/src=("|')?.+("|')?/g, 'src="' + src + '?raw=true"');
            };
        return content.replace(/<img\s+(?:[^>]*?\s+)?src="([^"]*)"/g, function (str, src) {
            var imgUrl;

            if (!src) {
                return str;
            }

            imgUrl = Url.parse(src);

            if (imgUrl.protocol && ['http:', 'https:'].indexOf(imgUrl.protocol) > -1) {
                return str;
            }

            //TODO ask for case with missed doc param
            return buildReplace(str, Url.resolve((doc ? doc.url : baseVersionGhUrl), src));        
        });
    },

    /**
     * Returns true if give url has protocol and it is different then http or https
     * @param {Object} url - url parsed object
     * @returns {boolean}
     */
    hasUnsupportedProtocol: function (url) {
        return !!url.protocol && ['http:', 'https:'].indexOf(url.protocol) === -1;
    },

    /**
     * Returns true if given url has only hash (anchor) and does not have any other fields
     * @param {Object} url - url parsed object
     * @returns {boolean}
     */
    isAnchor: function (url) {
        return !!url.hash && !url.protocol && !url.host && !url.path;
    },

    /**
     * Returns true if given url has protocol and it is one of http or https
     * @param {Object} url - url parsed object
     * @returns {boolean}
     */
    isAbsolute: function (url) {
        return !!url.protocol && ['http:', 'https:'].indexOf(url.protocol) > -1;
    },

    /**
     * Returns true if hostname of given url has github word inside
     * @param {Object} url - url parsed object
     * @returns {boolean}
     */
    isGithub: function (url) {
        return url.hostname.indexOf('github') > -1;
    },

    /**
     * Make corrections on some broken hrefs
     * @param {String} href - link href attribute value
     * @returns {String} - fixed href
     */
    fixBroken: function (href) {
        href = href.replace(/^&$/, '');
        href = href.replace(/^\(/, '');
        href = (/^github\.com/.test(href) ? 'https://' : '') + href;
        return href.replace(/^\/\/github/, 'https://github');
    },

    /**
     * Returns true if path of given url is in the list of existed site urls
     * @param {Object} url - url parsed object
     * @param {String[]} existed - array of existed site urls
     * @returns {boolean}
     */
    isNativeSiteLink: function (url, existed) {
        return existed.indexOf(url.path.replace(/\/$/, '')) > -1;
    },

    /**
     * Resolves given href on github url of document
     * @param {String} href - link href attribute value
     * @param {Object} doc - doc record value object. Has repo info inside
     * @param {String} treeOrBlob - special github url chunk. Can be 'tree' or 'blob'
     * @returns {String} - resolved url
     * @example
     * document url on github: 'https://github.com/user/repo/blob/master/foo/bar.md'
     * relative url in bar.md is: './bar1.md' or 'bar1.md'
     * resolved url will be: 'https://github.com/user/repo/blob/master/foo/bar1.md'
     */
    buildFullGhUrlToRelativeDocument: function (href, doc, treeOrBlob) {
        if (!doc || !doc.repo) {
            return href;
        }
        var repo = doc.repo,
            baseUrl = 'https://' + Path.join(repo.host, repo.user, repo.repo, treeOrBlob, repo.ref, repo.path || '');
        return Url.resolve(baseUrl, href);
    },

    /**
     * Builds full github links to json configuration files (package.json, bower.json, e.t.c)
     * @param {String} href - link href attribute value
     * @param {Object} node - page record value object. Contains route info inside.
     * @returns {String} - resolved url
     */
    buildFullGhUrlToJSONConfigurationFile: function (href, node) {
        var match = href.match(/(package\.json|bower\.json)/);
        if (!match) {
            return href;
        }
        var ghLibVersionUrl = node.ghLibVersionUrl,
            version = node.route.conditions.version;
        return [ghLibVersionUrl, 'blob', version, match[0]].join('/');
    },

    /**
     * Builds full github links to non dociumentations files. For example to block source files
     * @param {String} href - link href attribute value
     * @param {Object} node - page record value object. Contains route info inside.
     * @returns {String} - resolved url
     */
    buildFullGHUrlToNonDocumentationFile: function (href, node) {
        var conditions = node.route.conditions,
            blockRegexp = /^\.?\/?(?:\.\.\/)?([\w|-]+)\.blocks\/([\w|-]+)\/?([\w|-]+)?\.(?![md|html|ru\.md|en\.md])/,
            licenseRegexp = /^\.?\/?(?:\.\.\/)?LICENSE\.?(txt)?/i,
            contributingRegexp = /^\.?\/?(?:\.\.\/)?CONTRIBUTING\.([md|ru\.md|en\.md])/i,
            lib, version, match;

        if (!conditions || !conditions.lib || !conditions.version) {
            return href;
        }

        lib = conditions.lib;
        version = conditions.version;


        match = href.match(blockRegexp) || href.match(licenseRegexp) || href.match(contributingRegexp);
        if (match) {
            return [node.ghLibVersionUrl, 'blob', version,
                href.replace(/^\.?\/?(?:\.\.\/)?/, '').replace(/^\.?\/?/, '')].join('/');
        }
        return href;
    },

    /**
     * Builds site urls from relative links from one block to another on the same block level
     * @param {String} href attribute value
     * @param {Object} node - page record value object. Contains route info inside.
     * @returns {String} - resolved url
     * @example
     * Assuming that:
     * library name: my-lib
     * version: vx.y.z
     * level: desktop
     * block: input
     *
     * button.md => /libs/my-lib/vx.y.z/desktop/button
     * ./button.md => /libs/my-lib/vx.y.z/desktop/button
     * ../button/button.md => /libs/my-lib/vx.y.z/desktop/button
     */
    buildSiteUrlsForRelativeBlockLinksOnSameLevel: function (href, node) {
        var match = href.match(/^\.?\.?\/?([\w|-]+)\/?([\w|-]+)?\.?[md|html|ru\.md|en\.md]?/),
            conditions;
        if (!match) {
            return href;
        }

        conditions = node.route.conditions;
        return '/' + ['libs', conditions.lib, conditions.version, conditions.level, match[1]].join('/');
    },

    /**
     * Builds site urls from relative links from one block to another on different block levels
     * @param {String} href attribute value
     * @param {Object} node - page record value object. Contains route info inside.
     * @returns {String} - resolved url
     */
    buildSiteUrlsForRelativeBlockLinksOnDifferentLevel: function (href, node) {
        var match = href.match(/^\.\.?\/\.\.\/([\w|-]+)\.blocks\/([\w|-]+)\/?([\w|-]+)?\.?[md|html|ru\.md|en\.md]?/),
            conditions;
        if (!match) {
            return href;
        }

        conditions = node.route.conditions;
        return '/' + ['libs', conditions.lib, conditions.version, match[1], match[2]].join('/');
    },

    buildSiteUrlsForLibraryDocLinks: function (href, node) {
        var conditions = node.route.conditions,
            lib, version, match;

        if (!conditions || !conditions.lib || !conditions.version) {
            return href;
        }

        lib = conditions.lib;
        version = conditions.version;

        // common.blocks/button/button.ru.md
        match = href.match(/^\.?\/?(?:\.\.\/)?([\w|-]+)\.blocks\/([\w|-]+)\/?([\w|-]+)?\.[md|html|ru\.md|en\.md]/);
        if (match) {
            var level = match[1] === 'common' ? 'desktop' : match[1],
                block = match[2];

            return '/' + ['libs', lib, version, level, block].join('/');
        }

        // 3.1.0-changelog.md
        match = href.match(/^\.?\/?(\d+\.\d+\.\d+)\-([\w|-]+)?\.?[md|html|ru\.md|en\.md]?/);
        if (match) {
            return '/' + ['libs', lib, match[1], match[2]].join('/');
        }

        // ./changelog
        match = href.match(/^\.?\/?(?:\.\.\/)*?([\w|-]+)\.?[md|html|ru\.md|en\.md]?/);
        if (match) {
            match[1] = match[1].toLowerCase();
            return '/' + (match[1] === 'readme' ?
                    ['libs', lib, version].join('/') :
                    ['libs', lib, version, match[1]].join('/'));
        }

        return href;
    },

    /**
     * Finds url for replacement from url hash and existedUrls
     * @param {String[]} variants
     * @param {Object} urlHash - gh -> site urls hash
     * @param {String[]} existedUrls - array of existed site urls
     * @returns {*}
     */
    findReplacement: function (variants, urlHash, existedUrls) {
        var replacement = null;

        variants.some(function (item) {
            if (urlHash[item]) {
                replacement = urlHash[item];
                return true;
            }
            if (urlHash[item + '/README.md']) {
                replacement = urlHash[item + '/README.md'];
                return true;
            }
            if (existedUrls.indexOf(item) > -1) {
                replacement = item;
                return true;
            }
            return false;
        });

        return replacement;
    },

    replaceLinkHrefs: function (content, node, doc, urlHash, existedUrls) {
        var _this = this;
        return content.replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"/g, function (str, href) {
            var variants = [],
                replacement,
                originalHref = href,
                url;

            // decode html entities
            href = href.replace(/&#(x?)([0-9a-fA-F]+);?/g, function (str, bs, match) {
                return String.fromCharCode(parseInt(match, bs === 'x' ? 16 : 10));
            });

            href = _this.fixBroken(href);
            url = Url.parse(href);

            if (_this.isAnchor(url) ||
                _this.hasUnsupportedProtocol(url) ||
                _this.isNativeSiteLink(url, existedUrls) ||
                (_this.isAbsolute(url) && !_this.isGithub(url))) {
                return str;
            }

            href = Url.format(_.omit(url, 'hash')); // отрезаем якорь

            if (_this.isAbsolute(url) && _this.isGithub(url)) {
                variants.push(href.replace(/\/tree\//, '/blob/'));
                variants.push(href.replace(/\/blob\//, '/tree/'));
            } else {
                variants.push(_this.buildFullGhUrlToRelativeDocument(href, doc, 'tree'));
                variants.push(_this.buildFullGhUrlToRelativeDocument(href, doc, 'blob'));

                variants.push(_this.buildSiteUrlsForLibraryDocLinks(href, node));

                variants.push(_this.buildSiteUrlsForRelativeBlockLinksOnSameLevel(href, node));
                variants.push(_this.buildSiteUrlsForRelativeBlockLinksOnDifferentLevel(href, node));
            }

            replacement = _this.findReplacement(variants, urlHash, existedUrls);

            if (replacement) {
                href = replacement;
            } else if(_this.buildFullGhUrlToJSONConfigurationFile(href, node) !== href) {
                href = _this.buildFullGhUrlToJSONConfigurationFile(href, node);
            } else if (_this.buildFullGHUrlToNonDocumentationFile(href, node) !== href) {
                href = _this.buildFullGHUrlToNonDocumentationFile(href, node);
            } else if (!_this.isAbsolute(Url.parse(href))) {
                href = variants[0];
            }
                
            if (url.hash) {
                href = Url.format(_.merge(Url.parse(href), { hash: url.hash }));
            }

            /*
            if(originalHref !== href) {
                console.log('from: ' + $(this).attr('href') + ' to: ' + href + ' on page: ' + node.url);
            }
            */

            return '<a href="' + href + '"';
        });
    },

    /**
     * Override links for doc sources
     * @param {String} content doc node
     * @param {BaseNode} node - node record
     * @param {Object} doc - doc record
     * @param {Object} existed
     */
    overrideLinks: function(content, node, doc, existed) {
        if (!_.isString(content)) {
            return content;
        }

        // content = this.replaceImageSources(content, node, doc);
        content = this.replaceLinkHrefs(content, node, doc, existed.urlsHash, existed.existedUrls);

        return content;
    },

    /**
     * Creates url hash for resolve links
     * @param {TargetBase} target object
     * @returns {Promise}
     */
    collectUrls: function (target) {
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
                var existedUrls = [],
                    urlsHash = nodeRecords.reduce(function (prev, nodeRecord) {
                        var nodeValue = nodeRecord.value;

                        utility.getLanguages().forEach(function (lang) {
                            if (!nodeValue.hidden[lang]) {
                                var docUrl = docUrlsHash[Util.format('%s%s:%s', target.KEY.DOCS_PREFIX, nodeValue.id, lang)];
                                if (docUrl) {
                                    prev[docUrl] = nodeValue.url;
                                }
                            }
                        });
                        existedUrls.push(nodeValue.url);
                        return prev;
                    }, {});
                return { urlsHash: urlsHash, existedUrls: existedUrls };
            });
    },

    /**
     * Reads document page records from db
     * @param {TargetBase} target object
     * @param {Object[]} changedLibVersions - array with changed library versions
     * @returns {Promise}
     */
    getDocumentRecordsFromDb: function (target, changedLibVersions) {
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
    },

    /**
     * Reads block pages from database
     * @param {TargetBase} target object
     * @param {Object[]} changedLibVersions - array with changed library versions
     * @returns {Promise}
     */
    getBlockRecordsFromDb: function (target, changedLibVersions) {
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
    },

    /**
     * Overrides links for document page records
     * @param {TargetBase} target object
     * @param {Object} existed - exited urls data
     * @param {String []} languages - array of language identifiers
     * @param {Object[]} changedLibVersions - array with changed library versions
     * @returns {Promise}
     */
    overrideLinksInDocuments: function (target, existed, languages, changedLibVersions) {
        logger.debug('Start to override links in documents', module);
        var _this = this;
        /**
         * 1. Выбираем страницы документов из бд
         * 2. Делим массив полученных записей на массивы по 100 штук
         * 3. Последовательно выполняем переопределение ссылок для каждой порции записей
         * 3.1 Внутри порции переопредление ссылок для записей происходит параллельно
         * 3.2 Для каждой записи страницы выбираем связанную с ней запись документа
         * 3.3 Еслитаковая присутствует, то скармливаем ее content в переопределятор
         * 3.4 Сохраняем запись документа с измененным контентом
         */
        return this.getDocumentRecordsFromDb(target, changedLibVersions).then(function (records) {
            logger.debug(Util.format('Document records count: %s', records.length), module);
            var portionSize = PORTION_SIZE,
                portions = _.chunk(records, portionSize);

            logger.debug(Util.format('Document records were divided into %s portions', portions.length), module);

            return portions.reduce(function (prev, item, index) {
                prev = prev.then(function () {
                    logger.debug(Util.format('override document links in range %s - %s',
                        index * portionSize, (index + 1) * portionSize), module);
                    return vow.allResolved(item.map(function (_item) {
                        var nodeValue = _item.value;
                        return vow.all(languages.map(function (lang) {
                            var docKey = Util.format('%s%s:%s', target.KEY.DOCS_PREFIX, nodeValue.id, lang);
                            return levelDb.get().get(docKey)
                                .then(function (docValue) {
                                    if (!docValue || !docValue.content) {
                                        return vow.resolve();
                                    }
                                    docValue.content = _this.overrideLinks(docValue.content, nodeValue, docValue, existed);
                                    return levelDb.get().put(docKey, docValue);
                                }, this);
                        }, this));
                    }, this));
                }, this);
                return prev;
            }.bind(this), vow.resolve());
        });
    },

    /**
     * Overrides links for block page records
     * @param {TargetBase} target object
     * @param {Object} existed - exited urls data
     * @param {String []} languages - array of language identifiers
     * @param {Object[]} changedLibVersions - array with changed library versions
     * @returns {Promise}
     */
    overrideLinksInBlocks: function (target, existed, languages, changedLibVersions) {
        logger.debug('Start to override links in blocks', module);

        var _this = this;
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
        return this.getBlockRecordsFromDb(target, changedLibVersions).then(function (records) {
            logger.debug(Util.format('Block records count: %s', records.length), module);
                portionSize = PORTION_SIZE,
                portions = _.chunk(records, portionSize);

            logger.debug(Util.format('Block records were divided into %s portions', portions.length), module);

            return portions.reduce(function (prev, item, index) {
                prev = prev.then(function () {
                    logger.debug(Util.format('override block links in range %s - %s',
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
                                                _this.overrideLinks(item.content || '', nodeValue, null, existed);
                                        } else {
                                            blockValue.description[index].content =
                                                _this.overrideLinks(item.content || '', nodeValue, null, existed);
                                        }
                                    });
                                } else {
                                    if (blockValue[lang]) {
                                        blockValue[lang].description =
                                            _this.overrideLinks(description, nodeValue, null, existed);
                                    } else {
                                        blockValue.description =
                                            _this.overrideLinks(description, nodeValue, null, existed);
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
    },

    run: function (target) {
        logger.info('Start overriding links in documents', module);

        if (!target.getChanges().areModified()) {
            logger.warn('No changes were made during this synchronization. This step will be skipped', module);
            return vow.resolve(target);
        }

        var languages = utility.getLanguages(),
            librariesChanges = target.getChanges().getLibraries(),
            existed,
            changedLibVersions = []
                .concat(librariesChanges.getAdded())
                .concat(librariesChanges.getModified());

        return this.collectUrls(target)
            .then(function (_existed) {
                existed = _existed;
                logger.debug('Urls were collected. Start to process pages ...', module);
                return this.overrideLinksInDocuments(target, existed, languages, changedLibVersions);
            }, this)
            .then(function () {
                return this.overrideLinksInBlocks(target, existed, languages, changedLibVersions);
            }, this)
            .then(function () {
                logger.info('Links in documents were successfully overrided', module);
                return vow.resolve(target);
            })
            .fail(function (err) {
                logger.error(
                    Util.format('Overriding links failed with error %s', err.message), module);
                return vow.reject(err);
            });
    }
};
