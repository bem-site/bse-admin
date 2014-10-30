var _ = require('lodash'),
    utility = require('../../../util'),

    /**
     *
     * @param {String} name of block
     * @param {String} url of block
     * @param {String} lib - name of library
     * @param {String} version - name of library version
     * @param {String} level - name of level
     * @param {Object} data object for block
     * @param {Object/String} jsdoc
     * @returns {Block}
     * @constructor
     */
    Block = function (name, url, lib, version, level, data, jsdoc) {
        return this.init(name, url, lib, version, level, data, jsdoc);
    };

Block.prototype = {
    name: null,
    link: null,
    library: null,
    version: null,
    level: null,
    mods: [],
    elems: [],
    doc: undefined,
    jsdoc: undefined,

    /**
     *
     * @param {String} name of block
     * @param {String} url - link to block
     * @param {String} lib - name of library
     * @param {String} version of library
     * @param {String} level name
     * @param {Object} data of block
     * @param {Object/String} jsdoc
     * @returns {Block}
     */
    init: function (name, url, lib, version, level, data, jsdoc) {
        this.name = name;
        this.link = url;
        this.lib = lib;
        this.version = version;
        this.level = level;
        this.data = data;
        this.jsdoc = jsdoc;
        return this;
    },

    /**
     * Process data for block and
     * create list of elems, mods and other ...
     * @param {Object} data
     * @returns {Block}
     */
    processData: function (data) {
        if (!data) {
            this.elems = [];
            this.mods = [];
            this.doc = '';

            return this;
        }

        this.elems = (data.elems && _.isArray(data.elems)) ?
            _.pluck(data.elems, 'name') : [];

        this.mods = (data.mods && _.isArray(data.mods)) ?
            _.pluck(data.mods, 'name') : [];

        utility.getLanguages().forEach(function (lang) {
            var description = data[lang] ? data[lang].description : data.description;
            if (!description) {
                this.doc = '';
                return;
            }
            this.doc = _.isArray(description) ? description[0].content : description;
        }, this);

        return this;
    }
};

module.exports = Block;
