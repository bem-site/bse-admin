var util = require('util'),
    vow = require('vow'),

    logger = require('../../logger'),
    levelDb = require('../../providers/level-db'),
    utility = require('../../util'),
    nodes = require('./index'),

    /**
     * Subclass of dynamic nodes which describe single version of library
     * @param {BaseNode} parent node
     * @param {Object} version of library
     * @constructor
     */
    VersionNode = function (parent, version, cacheVersion) {
        this.setTitle(version)
            .setSource(version)
            .processRoute(parent, {
                conditions: {
                    lib: version.repo,
                    version: version.ref.replace(/\//g, '-')
                }
            })
            .init(parent)
            .addItems(version)
            .createBreadcrumbs();

        this.createMeta();
        this.cacheVersion = cacheVersion;
    };

VersionNode.prototype = Object.create(nodes.dynamic.DynamicNode.prototype);

VersionNode.prototype.TITLES = {
    CHANGELOG: { en: 'Changelog', ru: 'История изменений' },
    MIGRATION: { en: 'Migration', ru: 'Миграция' },
    NOTES: { en: 'Release Notes', ru: 'Замечания к релизу' }
};

/**
 * Sets title for node
 * @param {Object} version of library
 * @returns {VersionNode}
 */
VersionNode.prototype.setTitle = function (version) {
    this.title = utility.getLanguages().reduce(function (prev, lang) {
        prev[lang] = version.ref.replace(/\//g, '-');
        return prev;
    }, {});
    return this;
};

/**
 * Sets source for node
 * @param {Object} version of library
 * @returns {VersionNode}
 */
VersionNode.prototype.setSource = function (version) {
    var readme = version.docs ? version.docs.readme : {
        title: { en: 'Readme', ru: 'Readme' },
        content: version.readme
    };

    this.source = utility.getLanguages().reduce(function (prev, lang) {
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
VersionNode.prototype.setClass = function () {
    this.class = 'version';
    return this;
};

/**
 * Creates meta-information for search engines
 * @returns {VersionNode}
 */
VersionNode.prototype.createMeta = function () {
    nodes.base.BaseNode.prototype.createMeta.apply(this);
    var conditions = this.route.conditions;
    this.meta.fields = utility.getLanguages().reduce(function (prev, item) {
        prev[item] = {
            type: 'library',
            keywords: [
                'bem',
                'library',
                conditions.lib,
                // islands v2.0.0
                [conditions.lib, conditions.version].join(' '),
                // islands v2.0.0 description
                [conditions.lib, conditions.version, item === 'ru' ? 'описание': 'description'].join(' '),
                // islands v2.0.0 readme
                [conditions.lib, conditions.version, 'readme'].join(' ')
            ],
            library: {
                name: conditions.lib,
                version: conditions.version,
                status: 'current',
                page: 'description'
            }
        };
        return prev;
    }, {});
    return this;
};

/**
 * Adds items for node
 * @param {Object} version of library
 * @returns {VersionNode}
 */
VersionNode.prototype.addItems = function (version) {
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

    // add doc nodes to library version
    Object.keys(docs)
        .filter(function (item) {
            return item !== 'readme';
        })
        .forEach(function (item) {
            // verify existed docs
            if (!docs[item] || !docs[item].content) {
                return;
            }
            this.items.push(new nodes.post.PostNode(this, version, docs[item], item));
        }, this);

    // TODO implement it
    // add custom nodes to library version
    if (version.custom) {
        version.custom.forEach(function (item) {
            item.url += '#';
            var cItem = new nodes.base.BaseNode(item, this);
            cItem.saveToDb = function () {
                cItem.parent = cItem.parent.id;
                return { type: 'put', key: cItem.generateKey(), value: cItem };
            };
            this.items.push(cItem);
        }, this);
    }

    var levels = version.levels;
    if (!levels) {
        return this;
    }

    // add level nodes to library version
    levels.forEach(function (level) {
        level.name = level.name.replace(/\.(sets|docs)$/, '');

        // verify existed blocks for level
        if (level.blocks) {
            this.items.push(new nodes.level.LevelNode(this, version, level));
        }
    }, this);

    return this;
};

VersionNode.prototype.saveToDb = function () {
    return levelDb.get().batch(this.items.reduce(function (prev, item, index) {
            item.order = index;
            prev = prev.concat(prev, item.saveToDb());
            return prev;
        }, []))
        .then(function () {
            return vow.all(utility.getLanguages().map(function (lang) {
                this.source[lang].nodeId = this.id;
                this.source[lang].lang = lang;
                return levelDb.get().put(util.format('docs:%s:%s', this.id, lang), this.source[lang]);
            }, this));
        }, this)
        .then(function () {
            this.markAsHasItems()
                .markAsHasSource()
                .removeSourceField()
                .removeItemsField();

            logger.debug(util.format('%s library version %s saved to database',
                this.route.conditions.lib, this.route.conditions.version), module);

            return nodes.dynamic.DynamicNode.prototype.saveToDb.apply(this);
        }, this);
};

exports.VersionNode = VersionNode;
