var ChangeType = function (type) {
    this.type = type;
    this.init();
};

ChangeType.prototype = {
    _added: undefined,
    _modified: undefined,
    _removed: undefined,

    /**
     * Initialize ChangeType object
     * @returns {ChangeType}
     */
    init: function () {
        this._added = [];
        this._modified = [];
        this._removed = [];
        return this;
    },

    /**
     * Verify if data of given type were modified
     * @returns {Boolean}
     */
    areModified: function () {
        return this._added.length ||
            this._modified.length ||
            this._removed.length;
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
    getAdded: function () {
        return this._added;
    },

    /**
     * Returns items of modified group
     * @returns {*}
     */
    getModified: function () {
        return this._modified;
    },

    /**
     * Returns items of removed group
     * @returns {*}
     */
    getRemoved: function () {
        return this._removed;
    }
};

module.exports = ChangeType;
