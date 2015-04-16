var util = require('util'),
    utility = require('../../util'),
    DynamicNode = require('./dynamic').DynamicNode,

    /**
     * Subclass of dynamic nodes which describe person
     * @param {BaseNode} parent node
     * @param {String} key - person data key
     * @param {Object} person data
     * @constructor
     */
    PersonNode = function (parent, key, person) {
        this
            .setTitle(person)
            .setEmail(person)
            .processRoute(parent, {
                conditions: {
                    id: key
                }
            })
            .init(parent);
    };

PersonNode.prototype = Object.create(DynamicNode.prototype);

/**
 * Sets title for node
 * @param {Object} person - object data for person
 * @returns {PersonNode}
 */
PersonNode.prototype.setTitle = function (person) {
    this.title = utility.getLanguages().reduce(function (prev, lang) {
        prev[lang] = util.format('%s %s', person[lang]['firstName'], person[lang]['lastName']);
        return prev;
    }, {});
    return this;
};

/**
 * Gets email for node
 * @param {Object} person - object data for person
 * @returns {PersonNode}
 */
PersonNode.prototype.setEmail = function (person) {
    this.email = utility.getLanguages().reduce(function (prev, lang) {
        prev[lang] = person[lang].email[0] || '';
        return prev;
    }, {});
    return this;
};

/**
 * Sets view for node
 * @returns {PersonNode}
 */
PersonNode.prototype.setView = function () {
    this.view = this.VIEW.AUTHOR;
    return this;
};

/**
 * Sets class for node
 * @returns {PersonNode}
 */
PersonNode.prototype.setClass = function () {
    this.class = 'person';
    return this;
};

exports.PersonNode = PersonNode;
