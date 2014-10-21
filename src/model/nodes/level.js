var vow = require('vow'),
    levelDb = require('../../level-db'),
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

    blocks.forEach(function (block) {
        this.items.push(new nodes.block.BlockNode(this, version, level, block));
    }, this);
    return this;
};

LevelNode.prototype.saveToDb = function () {
    return vow
        .all(this.items.map(function (item) {
            return item.saveToDb();
        }))
        .then(levelDb.batch)
        .then(function () {
            if (this.items && this.items.length) {
                this.hasItems = true;
            }

            delete this.items;
            return nodes.dynamic.DynamicNode.prototype.saveToDb.apply(this);
        }, this);
};

exports.LevelNode = LevelNode;
