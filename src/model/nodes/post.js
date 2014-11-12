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
