var path = require('path'),
    logger = require('../../logger'),
    levelup  = require('levelup'),
    LevelHUD = require('levelhud');

module.exports = function () {
    return this
        .title('view data in database')
        .helpful()
        .act(function () {
            logger.info('Launch viewer fo data in database', module);
            var poneys = levelup(path.join(process.cwd(), 'db', 'leveldb'), { encoding: 'json' });
            new LevelHUD().use(poneys).listen(4420);
        });
};
