var _ = require('lodash'),
    susanin = require('susanin'),
    sha = require('sha1'),

  /**
   * Base class for nodes with common nodes methods
   * @param {BaseNode} node - source node object
   * @param {BaseNode} parent - parent node object
   * @constructor
   */
   BaseNode = function (node, parent) {
    Object.keys(node).forEach(function (key) { this[key] = node[key]; }, this);

    this.generateUniqueId()
        .setParent(parent)
        .setSize()
        .setTitle()
        .setHidden()
        .setView()
        .setLevel(parent)
        .setClass()
        .setSearch();
};

BaseNode.prototype = {

    VIEW: {
        INDEX: 'index',
        POST: 'post',
        POSTS: 'posts',
        AUTHOR: 'author',
        AUTHORS: 'authors',
        TAGS: 'tags',
        BLOCK: 'block'
    },
    TYPE: {
        SIMPLE: 'simple',
        GROUP: 'group',
        SELECT: 'select'
    },
    SIZE: {
        NORMAL: 'normal'
    },
    SITEMAP_XML: {
        FREQUENCIES: ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'],
        DEFAULT: {
            changefreq: 'weekly',
            priority: 0.5
        }
    },

    /**
     * Generate unique id for node as sha sum of node object
     * @returns {BaseNode}
     */
    generateUniqueId: function () {
        this.id = sha(JSON.stringify(this));
        return this;
    },

    /**
     * Sets parent for current node
     * @param {BaseNode } parent - parent node
     * @returns {BaseNode}
     */
    setParent: function (parent) {
        this.parent = parent;
        return this;
    },

    /**
     * Makes title consistent
     */
    setTitle: function () {
        if (this.title && _.isString(this.title)) {
            this.title = {
                en: this.title,
                ru: this.title
            };
        }
        return this;
    },

    /**
     * Sets view for node
     * @returns {BaseNode}
     */
    setView: function () {
        this.view = this.view ||
            (this.source ? this.VIEW.POST : this.VIEW.POSTS);
        return this;
    },

    /**
     * Sets size for node
     * @returns {BaseNode}
     */
    setSize: function () {
        this.size = this.size || this.SIZE.NORMAL;
        return this;
    },

    /**
     * Sets level for node
     * @param {BaseNode} parent - parent node
     * @returns {BaseNode}
     */
    setLevel: function (parent) {
        this.level = (parent.type === this.TYPE.GROUP || parent.type === this.TYPE.SELECT) ?
            parent.level : parent.level + 1;
        return this;
    },

    /**
     * Set hidden state for node
     */
    setHidden: function () {
        // show node for all locales
        if (!this.hidden) {
            this.hidden = {};
            return this;
        }

        // hide node for locales that exists in node hidden array
        if (_.isArray(this.hidden)) {
            this.hidden = {
                en: this.hidden.indexOf('en') !== -1,
                ru: this.hidden.indexOf('ru') !== -1
            };
            return this;
        }

        // hide node for all locales
        if (this.hidden === true) {
            this.hidden = {
                en: true,
                ru: true
            };
            return this;
        }

        return this;
    },

    /**
     * Sets class for node
     * @returns {BaseNode}
     */
    setClass: function () {
        this.class = 'base';
        return this;
    },

    /**
     * Creates breadcrumbs for current node
     * as suitable structure for templating
     */
    createBreadcrumbs: function () {
        this.breadcrumbs = [];

        var _this = this,
            traverse = function (node) {
                if (node.url) {
                    _this.breadcrumbs.unshift({
                        title: node.title,
                        url: node.url
                    });
                }

                if (node.parent) {
                    traverse(node.parent);
                }
            };

        traverse(this);
    },

    processRoute: function () {
        if (!this.route) {
            this.route = this.parent.route;
            this.type = this.type || (this.url ? this.TYPE.SIMPLE : this.TYPE.GROUP);
            return this;
        }

        // BEMINFO-195
        if (_.isString(this.route)) {
            this.route = {
                conditions: {
                    id: this.route
                }
            };
        }

        var fullRoute = _.extend({}, this.parent.route, this.route);
            fullRoute.conditions = _.extend(fullRoute.conditions || {}, this.route.conditions);
        this.url = susanin.Route(fullRoute).build(_.omit(fullRoute.conditions, 'query_string'));
        this.route = fullRoute;

        this.type = this.type || this.TYPE.SIMPLE;
        return this;
    },

    /**
     * Sets params for indexation by search engines
     * @returns {BaseNode}
     */
    setSearch: function () {
        var def = this.SITEMAP_XML.DEFAULT,
            search = this.search;

        if (!search) {
            this.search = def;
            return this;
        }

        // validate settled changefreq property
        if (!search.changefreq ||
            this.SITEMAP_XML.FREQUENCIES.indexOf(search.changefreq) === -1) {
            search.changefreq = def.changefreq;
        }

        // validate settled priority property
        if (!search.priority || search.priority < 0 || search.priority > 1) {
            search.priority = def.priority;
        }

        this.search  = search;
        return this;
    },

    isDifferentFromDb: function (dbRecord) {
        return _.isEqual(this, dbRecord);
    }
};

exports.BaseNode = BaseNode;
