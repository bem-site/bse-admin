var util = require('util'),
    utility = require('../../util'),
    nodes = require('./index'),

    /**
     * Subclass of dynamic nodes which describe showcase pagr
     * @param {VersionNode} parent node object
     * @param {Object} version - library version object
     * @param {Object} showcase object
     * @constructor
     */
    ShowcaseNode = function (parent, version, showcase) {
        this.setTitle(showcase)
            .setSource(showcase)
            .processRoute(parent, {
                conditions: {
                    lib: version.repo,
                    version: version.ref,
                    id: showcase.title
                }
            })
            .init(parent)
            .setView()
            .createBreadcrumbs();
    };

ShowcaseNode.prototype = Object.create(nodes.dynamic.DynamicNode.prototype);

/**
 * Sets title for node
 * @param {Object} showcase object
 * @returns {ShowcaseNode}
 */
ShowcaseNode.prototype.setTitle = function (showcase) {
    this.title = utility.getLanguages().reduce(function (prev, lang) {
        prev[lang] = _.isString(showcase.title) ? showcase.title : showcase.title[lang];
        return prev;
    }, {});
    return this;
};

/**
 * Sets source for node
 * @param {Object} showcase object
 * @returns {ShowcaseNode}
 */
ShowcaseNode.prototype.setSource = function (showcase) {
    this.content = showcase.content;
    return this;
};

/**
 * Sets class for node
 * @returns {ShowcaseNode}
 */
ShowcaseNode.prototype.setClass = function () {
    this.class = 'showcase';
    return this;
};

/**
 * Sets view for node
 * @returns {ShowcaseNode}
 */
ShowcaseNode.prototype.setView = function () {
    this.view = this.VIEW.SHOWCASE;
    return this;
};

ShowcaseNode.prototype.saveToDb = function () {
    this.parent = this.parent.id;
    return { type: 'put', key: this.generateKey(), value: this };
};

exports.ShowcaseNode = ShowcaseNode;

