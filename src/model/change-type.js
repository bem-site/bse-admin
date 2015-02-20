var ChangeType = function (type) {
    this.type = type;
    this.init();
};

ChangeType.prototype = {
    _added: undefined,
    _modified: undefined,
    _removed: undefined,

    init: function () {
        this._added = [];
        this._modified = [];
        this._removed = [];
    },

    areModified: function () {
        return this._added.length ||
            this._modified.length ||
            this._removed.length;
    },

    addAdded: function (item) {
        this._added.push(item);
    },

    addModified: function (item) {
        this._modified.push(item);
    },

    addRemoved: function (item) {
        this._removed.push(item);
    },

    getAdded: function () {
        return this._added;
    },

    getModified: function () {
        return this._modified;
    },

    getRemoved: function () {
        return this._removed;
    }
};

module.exports = ChangeType;
