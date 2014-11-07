var util = require('util'),
    path = require('path'),
    logger = require('../../logger'),
    levelup  = require('levelup'),
    LevelHUD = require('levelhud'),

    DEFAULT = {
        DB_PATH: 'db/leveldb',
        PORT: 3000
    };

module.exports = function () {
    return this
        .title('view data in database')
        .helpful()
        .opt()
            .name('database').title('Path to database')
            .short('db').long('database')
            .def(DEFAULT.DB_PATH)
            .end()
        .opt()
            .name('port').title('Port number')
            .short('p').long('port')
            .def(DEFAULT.PORT)
            .end()
        .act(function (opts) {
            var database = path.join(process.cwd(), opts.database || DEFAULT.DB_PATH),
                port = opts.port || DEFAULT.PORT;

            logger.info(util.format('Launch viewer on port %s fo data in database %s', port, database), module);
            return new LevelHUD().use(levelup(database, { encoding: 'json' })).listen(port);
        });
};
