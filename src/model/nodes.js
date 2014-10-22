var logger = require('../logger'),
    nodes = require('./nodes/index'),
    Nodes = function (content) {
        this._analyze(content)
            ._makePlainModel();
    };

Nodes.prototype = {
    _data: undefined
};

/**
 * @param {Object} content
 * @returns {*}
 * @private
 */
Nodes.prototype._analyze = function (content) {
    logger.info('Analyze model start', module);

    function traverseTreeNodes(node, parent) {
        node = new nodes.base.BaseNode(node, parent);
        node
            .processRoute()
            .createBreadcrumbs();

        if (node.items) {
            node.items = node.items.map(function (item) {
                return traverseTreeNodes(item, node);
            });
        }
        return node;
    }

    try {
        this._data = content.map(function (item) {
            return traverseTreeNodes(item, {
                level: -1,
                route: { name: null }
            });
        });
    } catch (err) {
        var error  = 'Error occur while model analyze';
        logger.error(error, module);
        throw new Error(error);
    }

    return this;
};

Nodes.prototype._makePlainModel = function () {
    logger.info('Make plain model start', module);

    var plain = [];
    function traverseTreeNodes(node, index) {
        node.order = index;
        plain.push(node);
        if (node.items && node.items.length) {
            node.hasItems = true;
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
    } catch (err) {
        var error = 'Error occur while making plain model';
        logger.error(error, module);
        throw new Error(error);
    }

    return this;
};

Nodes.prototype.removeSources = function () {
    this._data = this._data.map(function (item) {
        if (item.source) {
            item.hasSource = true;
            delete item.source;
        }
        return item;
    });
};

Nodes.prototype.getAll = function () {
    return this._data;
};

module.exports = Nodes;
