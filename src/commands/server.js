var logger = require('../logger'),
    server = require('../server');

module.exports = function () {
    return this
        .title('server command')
        .helpful()
        .act(function () {
            logger.info('START server', module);
            return server();
        });
};
