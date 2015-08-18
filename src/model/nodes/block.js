var util = require('util'),
    sha = require('sha1'),
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
            .init(parent)
            .createBreadcrumbs();
        this.createMeta(version);

      // get full github link on lib
        if (version.url) {
            this.ghLibVersionUrl = version.url;
        }
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

/**
 * Creates meta-information for search engines
 * @returns {BlockNode}
 */
BlockNode.prototype.createMeta = function (version) {
    nodes.base.BaseNode.prototype.createMeta.apply(this);
    var _this = this,
        conditions = this.route.conditions;

    this.meta.fields = utility.getLanguages().reduce(function (prev, item) {
        prev[item] = {
            type: 'block',
            keywords: [
                'bem',
                'block',
                // islands button
                [conditions.lib, _this.title[item]].join(' '),
                // islands v2.0.0 button
                [conditions.lib, conditions.version, _this.title[item]].join(' '),
                // islands v2.0.0 button desktop
                [conditions.lib, conditions.version, _this.title[item], conditions.level].join(' ')
            ],
            block: {
                name: _this.title[item],
                library: conditions.lib,
                version: conditions.version,
                level: conditions.level,
                status: version.isCurrent ? 'current' : 'default'
            }
        };
        return prev;
    }, {});
    return this;
};

BlockNode.prototype.saveToDb = function () {
    var batchOperations = [];

    ['data', 'jsdoc'].forEach(function(field) {
        var val = this.source[field];

        if (!val) {
            return;
        }
            
        var key = util.format('blocks:' + field + ':%s', sha(JSON.stringify(val)));

        batchOperations.push({
            type: 'put',
            key: key,
            value: val
        });

        this.source[field] = key;
    }, this);

    this.markAsHasSource();

    // var conditions = this.route.conditions;
    // logger.verbose(util.format('save lib: %s version: %s, level: %s block: %s',
    //    conditions.lib, conditions.version, conditions.level, conditions.block), module);

    this.parent = this.parent.id;
    return batchOperations.concat({
        type: 'put',
        key: this.generateKey(),
        value: this
    });
};

exports.BlockNode = BlockNode;
