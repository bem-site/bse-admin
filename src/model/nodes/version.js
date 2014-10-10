var vow = require('vow'),
    utility = require('../../util'),
    nodes = require('./index');

/**
 * Subclass of dynamic nodes which describe single version of library
 * @param parent - {BaseNode} parent node
 * @param version - {Object} version of library
 * @constructor
 */
var VersionNode = function(parent, version) {
    this.setTitle(version)
        .setSource(version)
        .processRoute(parent, {
            conditions: {
                lib: version.repo,
                version: version.ref.replace(/\//g, '-')
            }
        })
        .init(parent)
        .addItems(version);
};

VersionNode.prototype = Object.create(nodes.dynamic.DynamicNode.prototype);

VersionNode.prototype.TITLES = {
    CHANGELOG: { en: 'Changelog', ru: 'История изменений'},
    MIGRATION: { en: 'Migration', ru: 'Миграция'},
    NOTES: { en: 'Release Notes', ru: 'Замечания к релизу' }
};

/**
 * Sets title for node
 * @param version - {Object} library version
 * @returns {VersionNode}
 */
VersionNode.prototype.setTitle = function(version) {
    this.title = utility.getLanguages().reduce(function(prev, lang) {
        prev[lang] = version.ref.replace(/\//g, '-');
        return prev;
    }, {});
    return this;
};

/**
 * Sets source for node
 * @param version - {Object} library version
 * @returns {VersionNode}
 */
VersionNode.prototype.setSource = function(version) {
    var readme = version.docs ? version.docs.readme : {
        title: { en: 'Readme', ru: 'Readme'},
        content: version.readme
    };

    this.source = utility.getLanguages().reduce(function(prev, lang) {
        prev[lang] = {
            title: version.repo,
            deps: version.deps,
            url: version.url,
            content: (readme && readme.content) ? readme.content[lang] : null
        };
        return prev;
    }, {});

    return this;
};

/**
 * Sets class for node
 * @returns {VersionNode}
 */
VersionNode.prototype.setClass = function() {
    this.class = 'version';
    return this;
};

/**
 * Adds items for node
 * @param version - {Object} version of library
 * @returns {VersionNode}
 */
VersionNode.prototype.addItems = function(version) {
    this.items = [];

    var docs = version.docs || {
        changelog: {
            title: this.TITLES.CHANGELOG,
            content: version.changelog
        },
        migration: {
            title: this.TITLES.MIGRATION,
            content: version.migration
        },
        notes: {
            title: this.TITLES.NOTES,
            content: version.notes
        }
    };

    //add doc nodes to library version
    Object.keys(docs)
        .filter(function(item) {
            return 'readme' !== item;
        })
        .forEach(function(item) {
            //verify existed docs
            if(!docs[item] || !docs[item].content) {
                return;
            }
            this.items.push(new nodes.post.PostNode(this, version, docs[item], item));
        }, this);

    //TODO implement it
    //add custom nodes to library version
    //if(version.custom) {
    //    version.custom.forEach(function(item) {
    //        item.url += '#';
    //        this.items.push(new nodes.base.BaseNode(item, this));
    //    }, this);
    //}

    var levels = version.levels;
    if(!levels) {
        return this;
    }

    //add level nodes to library version
    levels.forEach(function(level) {
        level.name = level.name.replace(/\.(sets|docs)$/, '');

        //verify existed blocks for level
        if(level.blocks) {
            this.items.push(new nodes.level.LevelNode(this, version, level));
        }
    }, this);

    return this;
};

VersionNode.prototype.saveToDb = function() {
    return vow.all(this.items.map(function(item) {
            return item.saveToDb();
        })).then(function() {
            delete this.items;
            return nodes.dynamic.DynamicNode.prototype.saveToDb.apply(this);
        }, this);
};

exports.VersionNode = VersionNode;
