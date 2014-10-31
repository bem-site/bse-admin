var TargetClearDb = require('./src/targets/clear-db').TargetClearDb,
    TargetNodes = require('./src/targets/nodes').TargetNodes,
    TargetLibraries = require('./src/targets/libraries').TargetLibraries,
    TargetDocs = require('./src/targets/docs').TargetDocs;

module.exports = {

    /**
     * Removes all records from database
     * @returns {*}
     */
    clearDb: function () {
        return (new TargetClearDb({})).execute();
    },

    /**
     * Synchronize docs
     * @returns {*}
     */
    syncDocs: function () {
        return (new TargetDocs({})).execute();
    },
    /**
     * Synchronize libraries
     * @param {boolean} noCache - if true then file cache would be cleared for all libraries
     * @param {String} library - name of library. If noCache is true and lib settled then file cache would
     * be cleared only for this library.
     * @param {String} version - name of library version. If noCache is true and lib settled
     * and version settled then file cache would
     * be cleared only for this library version.
     * @returns {*}
     */
    syncLibraries: function (noCache, library, version) {
        var opts;
        if (noCache) {
            opts.noCache = true;

            if (library) {
                opts.lib = library;

                if (version) {
                    opts.version = version;
                }
            }
        }

        return (new TargetLibraries(opts)).execute();
    },

    syncNodes: function () {
        return (new TargetNodes({})).execute();
    }
};
