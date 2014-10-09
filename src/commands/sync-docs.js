var logger = require('../logger'),
    DocsSynchronizer = require('../synchronizers/docs').DocsSynchronizer;

module.exports = function () {
    return this
        .title('synchronize documentation files')
        .helpful()
        .act(function () {
            logger.info('Try to synchronize documentation', module);
            return (new DocsSynchronizer()).executeFromCommand();
        });
};
