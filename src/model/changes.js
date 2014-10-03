var NodesChange = function() {
        this.init();
    },
    PeopleChange = function() {
        this.init();
    },
    LibrariesChange = function() {
        this.init();
    },
    Changes = function() {
        this.init();
    },
    BaseChange = {
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

        getType: function() {
            return 'base';
        }
    };

NodesChange.prototype = Object.create(BaseChange);
NodesChange.prototype.getType = function() {
    return 'nodes';
};

PeopleChange.prototype = Object.create(BaseChange);
PeopleChange.prototype.getType = function() {
    return 'people';
};

LibrariesChange.prototype = Object.create(BaseChange);
PeopleChange.prototype.getType = function() {
    return 'libraries';
};

Changes.prototype = {
    _nodes: undefined,
    _people: undefined,
    _libraries: undefined,

    areModified: function() {
        return this.getNodes().areModified() ||
            this.getPeople().areModified() ||
            this.getLibraries().areModified();
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
        this._nodes = new NodesChange();
        this._people = new PeopleChange();
        this._libraries = new LibrariesChange();
    }
};

module.exports = Changes;

