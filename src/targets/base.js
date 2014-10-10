'use strict';

var Changes = require('../model/changes'),
    TargetBase = function(options) {
        this.init(options);
    };

TargetBase.prototype = {
    KEY: {
        NODE_PREFIX: 'nodes:',
        DOCS_PREFIX: 'docs:',
        PEOPLE_PREFIX: 'people:',
        VERSIONS_PEOPLE: 'versions:people',
        BLOCKS_PREFIX: 'blocks:'
    },

    tasks: [],
    options: undefined,
    changes: undefined,

    init: function(options) {
        this.options = options || {};
        this.changes = new Changes();
    },

    addTask: function(task) {
        this.tasks.push(task);
        return this;
    },

    getTasks: function() {
        return this.tasks;
    },

    getChanges: function() {
        return this.changes;
    },

    getOptions: function() {
        return this.options;
    },

    execute: function() {
        var _this = this,
            initial = this.getTasks().shift();
        return this.getTasks().reduce(function (prev, item) {
            return prev.then(function () {
                return item(_this);
            });
        }, initial(_this));
    }
};

exports.TargetBase = TargetBase;
