var logger = require('../logger'),
    TargetNodes = require('../targets/nodes').TargetNodes;

module.exports = function () {
    return this
        .title('synchronize model declaration')
        .helpful()
        .act(function () {
            logger.info('Try to synchronize documentation', module);
            return (new TargetNodes()).execute();
        });
};
