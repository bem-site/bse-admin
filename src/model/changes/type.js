'use strict';

var ChangeType = function (type) {
    this._type = type;
    this._added = [];
    this._modified = [];
    this._removed = [];
};

ChangeType.prototype = {
    _type: undefined,
    _added: undefined,
    _modified: undefined,
    _removed: undefined,

    /**
     * Verify if data of given type were modified
     * @returns {Boolean}
     */
    areModified: function () {
        return this._added.length || this._modified.length || this._removed.length;
    },

    /**
     * Add new items to added group
     * @param {Object} item
     * @returns {ChangeType}
     */
    addAdded: function (item) {
        this._added.push(item);
        return this;
    },

    /**
     * Add new items to modified group
     * @param {Object} item
     * @returns {ChangeType}
     */
    addModified: function (item) {
        this._modified.push(item);
        return this;
    },

    /**
     * Add new items to removed group
     * @param {Object} item
     * @returns {ChangeType}
     */
    addRemoved: function (item) {
        this._removed.push(item);
        return this;
    },

    /**
     * Returns items of added group
     * @returns {*}
     */
    get added() {
        return this._added;
    },

    /**
     * Returns items of modified group
     * @returns {*}
     */
    get modified() {
        return this._modified;
    },

    /**
     * Returns items of removed group
     * @returns {*}
     */
    get removed() {
        return this._removed;
    }
};

module.exports = ChangeType;
