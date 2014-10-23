var util = require('util'),
    sha = require('sha1'),
    levelDb = require('../../level-db'),
    logger = require('../../logger'),
    utility = require('../../util'),
    nodes = require('./index'),

  /**
   * Subclass of dynamic nodes which describe library blocks
   * @param {LevelNode} parent node
   * @param {Object} version of library
   * @param {Object} level of library blocks
   * @param {Object} block data
   * @constructor
   */
    BlockNode = function (parent, version, level, block) {
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
 * @param {Object} block
 * @returns {BlockNode}
 */
BlockNode.prototype.setTitle = function (block) {
    this.title = utility.getLanguages().reduce(function (prev, lang) {
        prev[lang] = block.name;
        return prev;
    }, {});
    return this;
};

/**
 * Sets source for node
 * @param {Object} version of library
 * @param {Object} level of library blocks
 * @param {Object} block data
 * @returns {BlockNode}
 */
BlockNode.prototype.setSource = function (version, level, block) {
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
BlockNode.prototype.setView = function () {
    this.view = this.VIEW.BLOCK;
    return this;
};

/**
 * Sets class for node
 * @returns {BlockNode}
 */
BlockNode.prototype.setClass = function () {
    this.class = 'block';
    return this;
};

BlockNode.prototype.saveToDb = function () {
    var dataKey = util.format('blocks:data:%s', sha(JSON.stringify(this.source.data))),
        jsdocKey = util.format('blocks:jsdoc:%s', sha(JSON.stringify(this.source.jsdoc))),
        batchOperations = [];

    if (this.source.data) {
        batchOperations.push({ type: 'put', key: dataKey, value: this.source.data });
    }

    if (this.source.jsdoc) {
        batchOperations.push({ type: 'put', key: jsdocKey, value: this.source.jsdoc });
    }

    return levelDb.batch(batchOperations).then(function () {
        this.source.data = dataKey;
        this.source.jsdoc = jsdocKey;
        this.markAsHasSource();

        // this.parent = this.parent.id;
        // batchOperations.push({ type: 'put', key: this.generateKey(), value: this });

        var conditions = this.route.conditions;
        logger.verbose(util.format('save lib: %s version: %s, level: %s block: %s',
            conditions.lib, conditions.version, conditions.level, conditions.block), module);

        return this.prepareToSaveToDb();
    }, this);
};

exports.BlockNode = BlockNode;
