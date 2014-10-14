var logger = require('../logger'),
    TargetNodes = require('../targets/nodes').TargetNodes,
    TargetNodesDev = require('../targets/nodes-dev').TargetNodesDev;

module.exports = function () {
    return this
        .title('synchronize model declaration')
        .helpful()
        .opt()
            .name('dev').title('Dev flag. Use only for development')
            .short('d').long('dev')
            .flag()
        .end()
        .act(function (opts) {
            logger.info('Try to synchronize documentation', module);
            if(opts.dev) {
                return (new TargetNodesDev()).execute();
            } else {
                return (new TargetNodes()).execute();
            }
        });
};
