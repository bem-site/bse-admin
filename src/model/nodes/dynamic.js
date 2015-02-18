var _ = require('lodash'),

    susanin = require('susanin'),

    levelDb = require('../../providers/level-db').get(),
    BaseNode = require('./base').BaseNode,

    /**
     * Subclass of BaseNode class
     * Base class for all dynamic nodes
     * @constructor
     */
    DynamicNode = function () {};

DynamicNode.prototype = Object.create(BaseNode.prototype);

/**
 * Init function for node
 * @param {BaseNode} parent node
 * @returns {DynamicNode}
 */
DynamicNode.prototype.init = function (parent) {
    this.setType()
        .setSize()
        .setView()
        .setHidden()
        .setLevel(parent)
        .setClass()
        .setSearch()
        .generateUniqueId()
        .setParent(parent);

    return this;
};

/**
 * Sets type for node
 * @returns {DynamicNode}
 */
DynamicNode.prototype.setType = function () {
    this.type = this.TYPE.SIMPLE;
    return this;
};

/**
 * Sets size for node
 * @returns {DynamicNode}
 */
DynamicNode.prototype.setSize = function () {
    this.size = this.SIZE.NORMAL;
    return this;
};

/**
 * Sets view for node
 * @returns {DynamicNode}
 */
DynamicNode.prototype.setView = function () {
    this.view = this.VIEW.POST;
    return this;
};

/**
 * Sets hidden state for node
 * @returns {DynamicNode}
 */
DynamicNode.prototype.setHidden = function () {
    this.hidden = {};
    return this;
};

/**
 * Sets class for node
 * @returns {DynamicNode}
 */
DynamicNode.prototype.setClass = function () {
    this.class = 'dynamic';
    return this;
};

/**
 * Create route and url fields for dynamic nodes
 * @param {BaseNode} parent node
 * @param {Object} params - route params of node
 * @returns {DynamicNode}
 */
DynamicNode.prototype.processRoute = function (parent, params) {
    var baseRoute = parent.route;
    Object.keys(params).forEach(function (paramsKey) {
        if (paramsKey === 'conditions') {
            baseRoute.conditions = baseRoute.conditions || {};
            Object.keys(params[paramsKey]).forEach(function (conditionsKey) {
                var brc = baseRoute.conditions[conditionsKey];
                brc = brc || [];
                if (!_.isArray(brc)) {
                    brc = [brc];
                }
                baseRoute.conditions[conditionsKey] = params.conditions[conditionsKey];
            });
        }
    });

    this.url = susanin.Route(baseRoute).build(params.conditions);
    this.route = _.extend({}, { name: baseRoute.name, pattern: baseRoute.pattern }, params);
    return this;
};

/**
 * Saves record in database
 * @returns {*}
 */
DynamicNode.prototype.saveToDb = function () {
    this.parent = this.parent.id;
    return levelDb.put(this.generateKey(), this);
};

/**
 * Creates breadcrumbs for current node
 * as suitable structure for templating
 */
DynamicNode.prototype.createBreadcrumbs = function () {
    this.breadcrumbs = [];

    var _this = this,
        traverse = function (node) {
            if (node.url) {
                _this.breadcrumbs.unshift({
                    title: node.title,
                    url: node.url
                });
            }

            if (node.parent) {
                if (node.parent.lib) {
                    _this.breadcrumbs = [].concat(node.parent.breadcrumbs || [], _this.breadcrumbs);
                }else {
                    traverse(node.parent);
                }
            }
        };

    traverse(this);
};

exports.DynamicNode = DynamicNode;
