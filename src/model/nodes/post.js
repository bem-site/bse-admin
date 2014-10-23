var util = require('util'),
    vow = require('vow'),
    levelDb = require('../../level-db'),
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
            .setSource(doc)
            .processRoute(parent, {
                conditions: {
                    lib: version.repo,
                    version: version.ref,
                    id: id
                }
            })
            .init(parent)
            .createBreadcrumbs();
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
 * @param {Object} doc object
 * @returns {PostNode}
 */
PostNode.prototype.setSource = function (doc) {
    this.source = utility.getLanguages().reduce(function (prev, lang) {
        prev[lang] = {
            title: doc.title[lang],
            content: doc.content[lang]
        };
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

PostNode.prototype.saveToDb = function () {
    return vow.all(utility.getLanguages().map(function (lang) {
        this.source[lang].nodeId = this.id;
        this.source[lang].lang = lang;
        return levelDb.put(util.format('docs:%s:%s', this.id, lang), this.source[lang]);
    }, this))
    .then(function () {
        this.markAsHasSource();
        delete this.source;
        return nodes.dynamic.DynamicNode.prototype.saveToDb.apply(this);
    }, this);
};

exports.PostNode = PostNode;
