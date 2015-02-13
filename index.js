var TargetUpdateModel = require('./src/targets/update-model'),
    TargetClearDb = require('./src/targets/clear-db'),
    TargetNodes = require('./src/targets/nodes'),
    TargetDocsDev = require('./src/targets/docs-dev'),
    TargetNodesDev = require('./src/targets/nodes-dev'),
    TargetLibrariesDev = require('./src/targets/libraries-dev');

module.exports = {
    /**
     * Removes all records from database
     * @returns {*}
     */
    clearDb: function (options) {
        return (new TargetClearDb(options)).execute();
    },

    /**
     * Rebuilds all data in database according to received model.
     * Creates new snapshot data, send it to remote hosts (optionally)
     * and switch testing symlink on this snapshot version
     * @param {Object} options
     * @returns {*}
     */
    syncNodes: function (options) {
        return (new TargetNodes(options)).execute();
    },

    /**
     *
     * @param {Object} options
     * @returns {*}
     */
    syncNodesDev: function (options) {
        return (new TargetNodesDev(options)).execute();
    },

    /**
     *
     * @param {Object} options
     * @returns {*}
     */
    syncLibrariesDev: function (options) {
        return (new TargetLibrariesDev(options)).execute();
    },

    /**
     *
     * @param {Object} options
     * @returns {*}
     */
    syncDocsDev: function (options) {
        return (new TargetDocsDev(options)).execute();
    },

    /**
     *
     * @param {Object} options
     * @returns {*}
     */
    updateModel: function (options) {
        return (new TargetUpdateModel(options)).execute();
    }
};
