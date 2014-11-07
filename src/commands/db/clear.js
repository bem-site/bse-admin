var util = require('util'),
    logger = require('../../logger'),
    TargetClearDb = require('../../targets/clear-db').TargetClearDb,

    DEFAULT = {
        DB_PATH: 'db/leveldb'
    };

module.exports = function () {
    return this
        .title('Removes data from database. You can specify key patterns for records which should be removed')
        .helpful()
        .opt()
            .name('database').title('Path to database')
            .short('db').long('database')
            .def(DEFAULT.DB_PATH)
            .end()
        .opt()
            .name('keys').title('Keys of records which should be removed')
            .short('k').long('keys')
            .arr()
            .end()
        .act(function (opts) {
            logger.info(util.format('Try to clear data for keys %s in database',
                opts.database, opts.keys || 'all'), module);
            return (new TargetClearDb(opts)).execute();
        });
};
