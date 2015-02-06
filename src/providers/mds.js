var MDS = require('mds-wrapper'),

    logger = require('../logger'),
    mds;

module.exports = {
    /**
     * Initialize mds storage
     * @param {Object} options for mds storage initialization
     * @returns {MDS}
     */
    init: function (options) {
        logger.info('Initialize mds API module', module);
        mds = new MDS(options);
        return mds;
    },

    /**
     * Returns media storage
     * @returns {MDS} media storage wrapper
     */
    get: function () {
        return mds;
    }
};
