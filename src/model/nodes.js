var logger = require('../logger'),

    nodes = require('./nodes/index'),
    Routes = require('./routes'),

    Nodes = function(content) {
        this._routes = new Routes();
        this._analyze(content)
            ._makePlainModel();
    };

Nodes.prototype = {
    _routes: undefined,
    _data: undefined
};

/**
 * @param content
 * @returns {*}
 * @private
 */
Nodes.prototype._analyze = function (content) {
    logger.info('Analyze model start', module);

    var _this = this;

    function traverseTreeNodes(node, parent) {
        node = new nodes.base.BaseNode(node, parent);
        node
            .processRoute(_this._routes)
            .createBreadcrumbs();

        if(node.items) {
            node.items = node.items.map(function(item) {
                return traverseTreeNodes(item, node);
            });
        }
        return node;
    }

    try {
        this._data = content.map(function (item) {
            return traverseTreeNodes(item, {
                level: -1,
                route: {name: null},
                params: {}
            });
        });
    } catch(err) {
        var error  = 'Error occur while model analyze';
        logger.error(error, module);
        throw new Error(error);
    }

    return this;
};

Nodes.prototype._makePlainModel = function() {
    logger.info('Make plain model start', module);

    var plain= [];
    function traverseTreeNodes(node) {
        plain.push(node);
        if(node.items) {
            node.items.forEach(traverseTreeNodes);
        }
    }

    try {
        this._data.forEach(traverseTreeNodes);
        plain
            .map(function (node) {
                node.parent = node.parent.id;
                return node;
            })
            .map(function (node) {
                delete node.items;
                return node;
            });
        this._data = plain;
    } catch(err) {
        var error = 'Error occur while making plain model';
        logger.error(error, module);
        throw new Error(error);
    }

    return this;
};

Nodes.prototype.getAll = function() {
    return this._data;
};

module.exports = Nodes;


