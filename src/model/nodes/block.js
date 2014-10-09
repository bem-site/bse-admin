var util = require('util'),
    sha = require('sha1'),
    vow = require('vow'),
    levelDb = require('../../level-db'),
    utility = require('../../util'),
    nodes = require('./index');

/**
 * Subclass of dynamic nodes which describe library blocks
 * @param parent - {LevelNode} parent node
 * @param version - {Object} version of library
 * @param level - {Object} version of library
 * @param block - {Object} block data
 * @constructor
 */
var BlockNode = function(parent, version, level, block) {
    this.setTitle(block)
        .setSource(version, level, block)
        .processRoute(parent, {
            conditions: {
                lib: version.repo,
                version: version.ref.replace(/\//g, '-'),
                level: level.name,
                block: block.name
            }
        })
        .init(parent);
};

BlockNode.prototype = Object.create(nodes.dynamic.DynamicNode.prototype);

/**
 * Sets title for node
 * @param block - {Object} block
 * @returns {BlockNode}
 */
BlockNode.prototype.setTitle = function(block) {
    this.title = utility.getLanguages().reduce(function(prev, lang) {
        prev[lang] = block.name;
        return prev;
    }, {});
    return this;
};

/**
 * Sets source for node
 * @param source - {Object} source
 * @returns {BlockNode}
 */
BlockNode.prototype.setSource = function(version, level, block) {
    this.source = {
        data: block.data,
        jsdoc: block.jsdoc,
        enb: version.enb,
        prefix: version.enb ?
            util.format('/__example/%s/%s', version.repo, version.ref) :
            util.format('/__example/%s/%s/%s.sets/%s', version.repo, version.ref, level.name, block.name)
    };

    return this;
};

/**
 * Sets view for node
 * @returns {BlockNode}
 */
BlockNode.prototype.setView = function() {
    this.view = this.VIEW.BLOCK;
    return this;
};

/**
 * Sets class for node
 * @returns {BlockNode}
 */
BlockNode.prototype.setClass = function() {
    this.class = 'block';
    return this;
};

BlockNode.prototype.saveToDb = function() {
    var dataStr = JSON.stringify(this.source.data),
        jsdocStr = JSON.stringify(this.source.jsdoc),
        dataKey = util.format('blocks:data:%s', sha(dataStr)),
        jsdocKey = util.format('blocks:jsdoc:%s', sha(jsdocStr));
    return vow.all([
        levelDb.put(dataKey, dataStr),
        levelDb.put(jsdocKey, jsdocStr)
    ]).then(function() {
        this.source.data = dataKey;
        this.source.jsdoc = jsdocKey;
        return nodes.dynamic.DynamicNode.prototype.saveToDb.apply(this);
    }, this);
};

exports.BlockNode = BlockNode;
