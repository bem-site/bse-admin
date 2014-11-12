var _ = require('lodash'),
    utility = require('../../util'),
    nodes = require('./index'),

    /**
     * Subclass of dynamic nodes which describe library block levels
     * @param {VersionNode} parent node
     * @param {Object} version object
     * @param {Object} level object
     * @constructor
     */
    LevelNode = function (parent, version, level) {
        this.setTitle(level)
            .processRoute(parent, {
                conditions: {
                    lib: version.repo,
                    version: version.ref.replace(/\//g, '-'),
                    level: level.name
                }
            })
            .init(parent)
            .addItems(version, level);
    };

LevelNode.prototype = Object.create(nodes.dynamic.DynamicNode.prototype);

/**
 * Sets title for node
 * @param {Object} level object
 * @returns {LevelNode}
 */
LevelNode.prototype.setTitle = function (level) {
    this.title = utility.getLanguages().reduce(function (prev, lang) {
        prev[lang] = level.name.replace(/\.(sets|docs)$/, '');
        return prev;
    }, {});

    return this;
};

/**
 * Sets type for node
 * @returns {LevelNode}
 */
LevelNode.prototype.setType = function () {
    this.type = this.TYPE.GROUP;
    return this;
};

/**
 * Sets class for node
 * @returns {LevelNode}
 */
LevelNode.prototype.setClass = function () {
    this.class = 'level';
    return this;
};

/**
 * Add block nodes as items to level
 * @param {Object} version object
 * @param {Object} level object
 */
LevelNode.prototype.addItems = function (version, level) {
    this.items = [];

    var blocks = level.blocks;
    if (!blocks) {
        return;
    }

    blocks
        .sort(function (a, b) {
            return a.name > b.name ? 1 : (a.name < b.name ? -1 : 0);
        })
        .forEach(function (block) {
            this.items.push(new nodes.block.BlockNode(this, version, level, block));
        }, this);
    return this;
};

LevelNode.prototype.saveToDb = function () {
    var batchOperations = this.items.reduce(function (prev, item, index) {
        item.order = index;
        prev = _.union(prev, item.saveToDb());
        return prev;
    }, []);

    if (this.items && this.items.length) {
        this.markAsHasItems();
    }

    this.removeItemsField();

    // var conditions = this.route.conditions;
    // logger.verbose(util.format('save lib: %s version: %s, level: %s',
    //    conditions.lib, conditions.version, conditions.level), module);

    this.parent = this.parent.id;
    return batchOperations.concat({
        type: 'put',
        key: this.generateKey(),
        value: this
    });
};

exports.LevelNode = LevelNode;
