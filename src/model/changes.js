var ChangeType = require('./change-type'),
    Changes = function () {
        this.init();
    };

Changes.prototype = {
    _docs: undefined,
    _nodes: undefined,
    _libraries: undefined,
    _modelChanged: false,

    init: function () {
        this._docs = new ChangeType('docs');
        this._nodes = new ChangeType('nodes');
        this._libraries = new ChangeType('libraries');
    },

    areModified: function () {
        return this.getDocs().areModified() ||
            this.getNodes().areModified() ||
            this.getLibraries().areModified();
    },

    getDocs: function () {
        return this._docs;
    },

    getNodes: function () {
        return this._nodes;
    },

    getLibraries: function () {
        return this._libraries;
    },

    setModelChanged: function () {
        this._modelChanged = true;
    },

    wasModelChanged: function () {
        return this._modelChanged;
    }
};

module.exports = Changes;
