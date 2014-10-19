var utility = require('../../util'),
    DynamicNode = require('./dynamic').DynamicNode,

    /**
     * Subclass of dynamic nodes which describe tag of post
     * @param {BaseNode} parent node
     * @param {String} tagKey - tag
     * @constructor
     */
    TagNode = function (parent, tagKey) {
        this.setTitle(tagKey)
            .processRoute(parent, {
                conditions: {
                    id: tagKey
                }
            })
            .init(parent);
    };

TagNode.prototype = Object.create(DynamicNode.prototype);

/**
 * Sets title for node
 * @param {String} tagKey - tag key
 * @returns {TagNode}
 */
TagNode.prototype.setTitle = function (tagKey) {
    this.title = utility.getLanguages().reduce(function (prev, lang) {
        prev[lang] = tagKey;
        return prev;
    }, {});
    return this;
};

/**
 * Sets view for node
 * @returns {TagNode}
 */
TagNode.prototype.setView = function () {
    this.view = this.VIEW.TAGS;
    return this;
};

/**
 * Sets class for node
 * @returns {TagNode}
 */
TagNode.prototype.setClass = function () {
    this.class = 'tag';
    return this;
};

exports.TagNode = TagNode;
