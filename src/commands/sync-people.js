var logger = require('../logger'),
    PeopleSynchronizer = require('../synchronizers/people').PeopleSynchronizer;

module.exports = function () {
    return this
        .title('synchronize people files')
        .helpful()
        .act(function () {
            logger.info('Try to synchronize people', module);
            return (new PeopleSynchronizer()).executeFromCommand();
        });
};
