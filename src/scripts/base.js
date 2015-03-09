'use strict';

var path = require('path'),
    vow = require('vow'),
    inherit = require('inherit'),
    Changes = require('../model/changes');

module.exports = inherit({
    _tasks: undefined,
    _options: undefined,
    _changes: undefined,

    __constructor: function (options) {
        this._options = options || {};
        this._changes = new Changes();
    },

    /**
     * Add task to target
     * @param {Function} task function
     * @returns {*}
     */
    addTask: function (task) {
        this._tasks = this._tasks || [];
        this._tasks.push(task);
        return this;
    },

    /**
     * Returns name of target
     * @returns {string}
     */
    get name() {
        return 'BASE';
    },

    /**
     * Returns array of task functions
     * @returns {Array}
     */
    get tasks() {
        return this._tasks;
    },

    /**
     * Returns changes model
     * @returns {Changes}
     */
    get changes() {
        return this._changes;
    },

    /**
     * Returns options object
     * @returns {Object}
     */
    get options() {
        return this._options;
    },

    /**
     * Runs all tasks in serial mode
     * @returns {*}
     */
    execute: function () {
        var _this = this;
        return this.tasks.reduce(function (prev, item) {
            return prev.then(function () {
                return item(_this);
            });
        }, vow.resolve(_this));
    },

    /**
     * Clear all target changes
     * @returns {*}
     */
    clearChanges: function () {
        this._changes = new Changes();
        return this;
    }
}, {
    MODEL: {
        CURRENT: path.join(process.cwd(), 'model', 'model.json'),
        FULL: path.join(process.cwd(), 'model', '_model.json'),
        OLD: path.join(process.cwd(), 'model', 'old')
    },
    CACHE: {
        DIR: path.join(process.cwd(), 'cache'),
        LIBRARIES: path.join(process.cwd(), 'cache', 'libraries'),
        DOCS: path.join(process.cwd(), 'cache', 'docs')
    }
});
