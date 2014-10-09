var logger = require('../logger'),
    LibrariesSynchronizer = require('../synchronizers/libraries').LibrariesSynchronizer;

module.exports = function () {
    return this
        .title('synchronize libraries files')
        .helpful()
        .opt()
            .name('noCache').title('Drops libraries cache on file system')
            .short('nc').long('no-cache')
            .flag()
            .end()
        .act(function (opts) {
            logger.info('Try to synchronize libraries', module);
            return (new LibrariesSynchronizer()).executeFromCommand(opts);
        });
};
