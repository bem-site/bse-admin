var logger = require('../../logger'),
    TargetNodesDev = require('../../targets/nodes-dev').TargetNodesDev;

module.exports = function () {
    return this
        .title('synchronize model declaration')
        .helpful()
        .act(function (opts) {
            logger.info('Try to synchronize documentation', module);
            return (new TargetNodesDev(opts)).execute();
        });
};
