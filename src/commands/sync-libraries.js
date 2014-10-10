var logger = require('../logger'),
    TargetLibraries = require('../targets/libraries').TargetLibraries;

module.exports = function () {
    return this
        .title('synchronize libraries files')
        .helpful()
        .opt()
            .name('noCache').title('Drops libraries cache on file system')
            .short('nc').long('no-cache')
            .flag()
            .end()
        .opt()
            .name('lib').title('Name of library')
            .short('r').long('library')
            .end()
        .opt()
            .name('version').title('Name of library version')
            .short('v').long('version')
            .end()
        .act(function (opts) {
            logger.info('Try to synchronize libraries', module);
            return (new TargetLibraries(opts)).execute();
        });
};
