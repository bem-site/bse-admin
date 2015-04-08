'use strict';

var path = require('path'),
    vow = require('vow'),
    Changes = require('../model/changes'),
    failTask = require('../tasks/fail'),
    TargetBase = function (options) {
        this.init(options);
    };

TargetBase.prototype = {
    CACHE_DIR: path.join(process.cwd(), 'cache'),
    DB_DIR: path.join(process.cwd(), 'db'),
    SNAPSHOTS_DIR: path.join(process.cwd(), 'db', 'snapshots'),
    KEY: {
        NODE_PREFIX: 'nodes:',
        DOCS_PREFIX: 'docs:',
        PEOPLE_PREFIX: 'people:',
        BLOCKS_PREFIX: 'blocks:',
        URL_PREFIX: 'urls:',
        VERSIONS_PEOPLE: 'versions:people',
        AUTHORS: 'authors',
        TRANSLATORS: 'translators',
        TAGS: 'tags'
    },

    tasks: undefined,
    options: undefined,
    changes: undefined,
    snapshot: undefined,

    /**
     * Initialize target
     * @param {Object} options object
     */
    init: function (options) {
        this.options = options || {};
        this.changes = new Changes();
    },

    /**
     * Returns name of target
     * @returns {string}
     */
    getName: function () {
        return 'BASE';
    },

    /**
     * Add task to target
     * @param {Function} task function
     * @returns {TargetBase}
     */
    addTask: function (task) {
        this.tasks = this.tasks || [];
        this.tasks.push(task);
        return this;
    },

    /**
     * Returns array of task functions
     * @returns {Array}
     */
    getTasks: function () {
        return this.tasks;
    },

    /**
     * Returns changes model
     * @returns {*}
     */
    getChanges: function () {
        return this.changes;
    },

    /**
     * Returns options object
     * @returns {*}
     */
    getOptions: function () {
        return this.options;
    },

    /**
     * Runs all tasks in serial mode
     * @returns {*}
     */
    execute: function () {
        var _this = this;
        return this.getTasks().reduce(function (prev, item) {
            return prev.then(function () {
                return item(_this);
            });
        }, vow.resolve(_this)).fail(function (err) {
            return failTask(_this, err);
        });
    },

    /**
     * Clear all target changes
     * @returns {TargetBase}
     */
    clearChanges: function () {
        this.changes = new Changes();
        return this;
    },

    /**
     * Returns name of created db snapshot
     * @returns {String}
     */
    getSnapshotName: function () {
        return this.snapshot;
    },

    /**
     * Sets name of created snapshot
     * @param {String} snapshot name
     * @returns {TargetBase}
     */
    setSnapshotName: function (snapshot) {
        this.snapshot = snapshot;
        return this;
    }
};

module.exports = TargetBase;
