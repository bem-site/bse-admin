var util = require('util'),

    _ = require('lodash'),
    vow = require('vow'),
    susanin = require('susanin'),
    deepExtend = require('deep-extend'),

    levelDb = require('../../level-db'),
    BaseNode = require('./base').BaseNode;

/**
 * Subclass of BaseNode class
 * Base class for all dynamic nodes
 * @constructor
 */
var DynamicNode = function() {};

DynamicNode.prototype = Object.create(BaseNode.prototype);

/**
 * Init function for node
 * @param parent - {Object} parent node
 * @returns {DynamicNode}
 */
DynamicNode.prototype.init = function(parent) {

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
DynamicNode.prototype.setType = function() {
    this.type = this.TYPE.SIMPLE;
    return this;
};

/**
 * Sets size for node
 * @returns {DynamicNode}
 */
DynamicNode.prototype.setSize = function() {
    this.size = this.SIZE.NORMAL;
    return this;
};

/**
 * Sets view for node
 * @returns {DynamicNode}
 */
DynamicNode.prototype.setView = function() {
    this.view = this.VIEW.POST;
    return this;
};

/**
 * Sets hidden state for node
 * @returns {DynamicNode}
 */
DynamicNode.prototype.setHidden = function() {
    this.hidden = {};
    return this;
};

/**
 * Sets class for node
 * @returns {DynamicNode}
 */
DynamicNode.prototype.setClass = function() {
    this.class = 'dynamic';
    return this;
};

/**
 * Create route and url fields for dynamic nodes
 * @param routes - {Object} application routes hash
 * @param parent - {BaseNode} parent node
 * @param params - {Object} route params of node
 * @returns {DynamicNode}
 */
DynamicNode.prototype.processRoute = function(parent, params) {
    var fullRoute = deepExtend(parent.route, params),
        fullConditions = _.extend(fullRoute.conditions || {}, params);

    this.url = susanin.Route(fullRoute).build(_.omit(fullConditions, 'query_string'));
    this.route = fullRoute;
    return this;
};

DynamicNode.prototype.generateKey = function() {
    return util.format('nodes:%s:%s', this.id, this.parent);
};

DynamicNode.prototype.saveToDb = function() {
    this.parent = this.parent.id;
    return levelDb.put(this.generateKey(), this);
};

DynamicNode.prototype.prepareToSaveToDb = function() {
    this.parent = this.parent.id;
    return vow.resolve({ type: 'put', key: this.generateKey(), value: this });
};

exports.DynamicNode = DynamicNode;
