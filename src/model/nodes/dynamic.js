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
    var baseRoute = parent.route;
    Object.keys(params).forEach(function(paramsKey) {
        if(paramsKey === 'conditions') {
            baseRoute.conditions = baseRoute.conditions || {};
            Object.keys(params[paramsKey]).forEach(function(conditionsKey) {
                var brc = baseRoute.conditions[conditionsKey];
                brc = brc || [];
                if(!_.isArray(brc)) {
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
 * Generates string key for database record
 * @returns {String}
 */
DynamicNode.prototype.generateKey = function() {
    return util.format('nodes:%s', this.id);
};

/**
 * Saves record in database
 * @returns {*}
 */
DynamicNode.prototype.saveToDb = function() {
    this.parent = this.parent.id;
    return levelDb.put(this.generateKey(), this);
};

/**
 * Returns operation object for database batch operation
 * @returns {*}
 */
DynamicNode.prototype.prepareToSaveToDb = function() {
    this.parent = this.parent.id;
    return vow.resolve({ type: 'put', key: this.generateKey(), value: this });
};

exports.DynamicNode = DynamicNode;
