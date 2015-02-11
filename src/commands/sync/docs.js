var logger = require('../../logger'),
    Target = require('../../targets/docs-dev');

module.exports = function () {
    return this
        .title('synchronize docs data')
        .helpful()
        .act(function (opts) {
            logger.info('Try to synchronize docs', module);
            return (new Target(opts)).execute();
        });
};
