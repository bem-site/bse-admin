var TargetClearDb = require('./src/targets/clear-db').TargetClearDb,
    TargetNodes = require('./src/targets/nodes').TargetNodes;

module.exports = {

    /**
     * Removes all records from database
     * @returns {*}
     */
    clearDb: function () {
        return (new TargetClearDb({})).execute();
    },

    syncNodes: function () {
        return (new TargetNodes({})).execute();
    }
};
