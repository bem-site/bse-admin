var Changes = function() {
        this.init();
    },
    Change = function(type) {
        this.type = type;
        this.init();
    };

Change.prototype = {
    _added: undefined,
    _modified: undefined,
    _removed: undefined,

    _areAddedItems: function() {
        return this._added.length;
    },

    _areModifiedItems: function() {
        return this._modified.length;
    },

    _areRemovedItems: function() {
        return this._removed.length;
    },

    areModified: function() {
        return this._areAddedItems() || this._areModifiedItems() || this._areRemovedItems();
    },

    init: function() {
        this._added = [];
        this._modified = [];
        this._removed = [];
    },

    addAdded: function(item) {
        this._added.push(item);
    },

    addModified: function(item) {
        this._modified.push(item);
    },

    addRemoved: function(item) {
        this._removed.push(item);
    },

    getAdded: function() {
        return this._added;
    },

    getModified: function() {
        return this._modified;
    },

    getRemoved: function() {
        return this._removed;
    }
};

Changes.prototype = {
    _docs: undefined,
    _meta: undefined,
    _nodes: undefined,
    _people: undefined,
    _libraries: undefined,

    areModified: function() {
        return this.getDocs().areModified() ||
            this.getMeta().areModified() ||
            this.getNodes().areModified() ||
            this.getPeople().areModified() ||
            this.getLibraries().areModified();
    },

    getDocs: function() {
        return this._docs;
    },

    getMeta: function() {
        return this._meta;
    },

    getNodes: function() {
        return  this._nodes;
    },

    getPeople: function() {
        return this._people;
    },

    getLibraries: function() {
        return this._libraries;
    },

    init: function() {
        this._docs = new Change('docs');
        this._meta = new Change('meta');
        this._nodes = new Change('nodes');
        this._people = new Change('people');
        this._libraries = new Change('libraries');
    }
};

module.exports = Changes;

