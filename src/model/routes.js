var _ = require('lodash'),
    susanin = require('susanin'),

    Routes = function() {};

Routes.prototype = {
    _data: {}
};

/**
 * Returns route by it name
 * @param {String} name of route
 * @returns {*}
 * @private
 */
Routes.prototype._getByName = function(name) {
    return this._data[name];
};

/**
 * Returns existed route by it name or set if not exist
 * @param {String} name of route
 * @param {Object} route object
 * @private
 */
Routes.prototype._setByName = function(name, route) {
    this._data[name] = this._getByName(name) || route;
};

/**
 *
 * @param node
 * @param params
 * @returns {*|Rsync}
 * @private
 */
Routes.prototype._getUrl = function(node, params) {
    return susanin.Route(this._getByName(node.route.name)).build(_.extend(node.params, params));
};

/**
 *
 * @param name
 * @param optionName
 * @private
 */
Routes.prototype._findOrCreateOptions = function(name, optionName) {
    this._getByName(name)[optionName] = this._getByName(name)[optionName] || {};
    return this._getByName(name)[optionName];
};

/**
 *
 * @param name
 * @param optionName
 * @param key
 * @private
 */
Routes.prototype._findOrCreateOptionsKey = function(name, optionName, key) {
    this._findOrCreateOptions(name, optionName)[key] = this._findOrCreateOptions(name, optionName)[key] || [];
    return this._findOrCreateOptions(name, optionName)[key];
};

/**
 *
 * @param node
 */
Routes.prototype.addRoute = function(node) {

    var r = node.route;

    if(r.name) {
        this._setByName(r.name, { name: r.name, pattern: r.pattern });
        node.url = this._getUrl(node, {});
    }else {
        r.name = node.parent.route.name;
    }

    ['defaults', 'conditions', 'data'].forEach(function(item) {
        this._findOrCreateOptions(r.name, item);

        if(r[item]) {
            Object.keys(r[item]).forEach(function(key) {
                if(item === 'conditions') {
                    this._findOrCreateOptionsKey(r.name, item, key);
                    this._getByName(r.name)[item][key] =
                        this._findOrCreateOptionsKey(r.name, item, key).concat(r[item][key]);
                    node.url = this._getUrl(node, r[item]);
                }else {
                    this._getByName(r.name)[item][key] = r[item][key];
                }
            }, this);
        }
    }, this);
};

module.exports = Routes;
