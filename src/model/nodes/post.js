var util = require('util'),
    utility = require('../../util'),
    nodes = require('./index'),

    /**
     * Subclass of dynamic nodes which describe post of library
     * @param {VersionNode} parent node object
     * @param {Object} version - library version object
     * @param {Object} doc object
     * @param {String} id - key of doc
     * @constructor
     */
    PostNode = function (parent, version, doc, id) {
        this.setTitle(doc)
            .setSource(version, doc)
            .processRoute(parent, {
                conditions: {
                    lib: version.repo,
                    version: version.ref,
                    id: id
                }
            })
            .init(parent)
            .createBreadcrumbs();
        this.createMeta(id, version);
    };

PostNode.prototype = Object.create(nodes.dynamic.DynamicNode.prototype);

/**
 * Sets title for node
 * @param {Object} doc object
 * @returns {PostNode}
 */
PostNode.prototype.setTitle = function (doc) {
    this.title = doc.title;
    return this;
};

/**
 * Sets source for node
 * @param {Object} version - library version object
 * @param {Object} doc object
 * @returns {PostNode}
 */
PostNode.prototype.setSource = function (version, doc) {
    if (version.url) {
        this.ghLibVersionUrl = version.url;
    }

    this.source = utility.getLanguages().reduce(function (prev, lang) {
        var regExp = /^https?:\/\/(.+?)\/(.+?)\/(.+?)\/(tree|blob)\/(.+?)\/(.+)/,
            parsedRepo,
            repo;

        prev[lang] = {
            title: doc.title[lang],
            content: doc.content[lang],
            isLibraryDoc: true
        };

        if (doc.url && doc.url[lang]) {
            prev[lang].url = doc.url[lang];
            parsedRepo = doc.url[lang].match(regExp);
        }

        if (parsedRepo) {
            repo = {
                host: parsedRepo[1],
                user: parsedRepo[2],
                repo: parsedRepo[3],
                ref:  parsedRepo[5],
                path: parsedRepo[6],
                hasIssues: version.hasIssues
            };
            prev[lang].repo = repo;
        }

        return prev;
    }, {});

    return this;
};

/**
 * Sets class for node
 * @returns {PostNode}
 */
PostNode.prototype.setClass = function () {
    this.class = 'post';
    return this;
};

/**
 * Creates meta-information for search engines
 * @param {String} docType - type of document
 * @returns {PostNode}
 */
PostNode.prototype.createMeta = function (docType, version) {
    nodes.base.BaseNode.prototype.createMeta.apply(this);
    var conditions = this.route.conditions;
    this.meta.fields = utility.getLanguages().reduce(function (prev, item) {
        prev[item] = {
            type: 'library',
            keywords: [
                'bem',
                'library',
                conditions.lib,
                // islands v2.0.0
                [conditions.lib, conditions.version].join(' '),
                // islands v2.0.0 changelog|migration|...
                [conditions.lib, conditions.version, docType].join(' ')
            ],
            library: {
                name: conditions.lib,
                version: conditions.version,
                status: version.isCurrent ? 'current' : 'default',
                page: docType
            }
        };
        return prev;
    }, {});
    return this;
};

PostNode.prototype.saveToDb = function () {
    var _this = this,
        batchOperations = utility.getLanguages().reduce(function (prev, lang) {
            _this.source[lang].nodeId = _this.id;
            _this.source[lang].lang = lang;
            prev = prev.concat({
                type: 'put',
                key: util.format('docs:%s:%s', _this.id, lang),
                value: _this.source[lang]
            });
            return prev;
        }, []);

    this.markAsHasSource()
        .removeSourceField();

    this.parent = this.parent.id;
    return batchOperations.concat({
        type: 'put',
        key: this.generateKey(),
        value: this
    });
};

exports.PostNode = PostNode;
