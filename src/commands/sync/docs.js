var logger = require('../../logger'),
    TargetDocs = require('../../targets/docs').TargetDocs;

module.exports = function () {
    return this
        .title('synchronize documentation files')
        .helpful()
        .act(function () {
            logger.info('Try to synchronize documentation', module);
            return (new TargetDocs()).execute();
        });
};
