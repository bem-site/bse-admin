var _ = require('lodash'),
    Library = function (name) {
        return this.init(name);
    };

Library.prototype = {

    name: null,
    versions: null,

    /**
     * Initialize search library object
     * @param {String} name of library
     * @returns {Library}
     */
    init: function (name) {
        this.name = name;
        this.versions = [];
        return this;
    },

    /**
     * Returns name of library
     * @returns {String}
     */
    getName: function () {
        return this.name;
    },

    /**
     * Add version to library search item
     * @param {String} version of library
     * @returns {Library}
     */
    addVersion: function (version) {
        this.versions.push(version);
        return this;
    },

    /**
     * Finds version of library by it name
     * @param {String} name of library version
     * @returns {Version}
     */
    getVersion: function (name) {
        return _.find(this.versions, function (item) {
            return item.name && item.name === name;
        });
    }
};

module.exports = Library;
