var logger = require('../../logger'),
    Target = require('../../targets/libraries-dev');

module.exports = function () {
    return this
        .title('synchronize libraries data')
        .helpful()
        .act(function (opts) {
            logger.info('Try to synchronize libraries', module);
            return (new Target(opts)).execute();
        });
};
