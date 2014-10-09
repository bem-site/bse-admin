var logger = require('../logger'),
    NodesSynchronizer = require('../synchronizers/nodes').NodesSynchronizer;

module.exports = function () {
    return this
        .title('synchronize model declaration')
        .helpful()
        .act(function () {
            logger.info('Try to synchronize documentation', module);
            return (new NodesSynchronizer()).executeFromCommand();
        });
};
