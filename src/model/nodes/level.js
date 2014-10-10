var vow = require('vow'),
    levelDb = require('../../level-db'),
    utility = require('../../util'),
    nodes = require('./index');

/**
 * Subclass of dynamic nodes which describe library block levels
 * @param parent - {VersionNode} parent node
 * @param version - {Object} version object
 * @param level - {Object} level object
 * @constructor
 */
var LevelNode = function(parent, version, level) {
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
 * @param level - {Object} level
 * @returns {LevelNode}
 */
LevelNode.prototype.setTitle = function(level) {
    this.title = utility.getLanguages().reduce(function(prev, lang) {
        prev[lang] = level.name.replace(/\.(sets|docs)$/, '');
        return prev;
    }, {});

    return this;
};

/**
 * Sets type for node
 * @returns {LevelNode}
 */
LevelNode.prototype.setType = function() {
    this.type = this.TYPE.GROUP;
    return this;
};

/**
 * Sets class for node
 * @returns {LevelNode}
 */
LevelNode.prototype.setClass = function() {
    this.class = 'level';
    return this;
};

/**
 * Add block nodes as items to level
 * @param version - {Object} version object
 * @param level - {Object} level object
 */
LevelNode.prototype.addItems = function(version, level) {
    this.items = [];

    var blocks = level.blocks;
    if(!blocks) {
        return;
    }

    blocks.forEach(function(block) {
        this.items.push(new nodes.block.BlockNode(this, version, level, block));
    }, this);
    return this;
};

LevelNode.prototype.saveToDb = function() {
    return vow
        .all(this.items.map(function(item) {
            return item.saveToDb();
        }))
        .then(levelDb.batch)
        .then(function() {
            delete this.items;
            return nodes.dynamic.DynamicNode.prototype.saveToDb.apply(this);
        }, this);
};

exports.LevelNode = LevelNode;
