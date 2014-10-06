var util = require('util'),

    vow = require('vow'),
    CronJob = require('cron').CronJob,

    logger = require('./logger'),
    levelDb = require('./level-db'),
    githubApi = require('./gh-api'),
    Changes = require('./model/changes'),

    job;

function execute () {
    logger.info('=== check for data start ===', module);
    var changes = new Changes();
    return vow.resolve()
        .then(require('./checkers/versions'))
        .then(require('./checkers/nodes')(changes))
        .then(require('./checkers/docs')(changes))
        .then(require('./checkers/people')(changes))
        .then(require('./checkers/libraries')(changes))
        .then(function() {
            logger.info('=== check for data end ===', module);
        })
        .fail(function(err) {
            logger.error(util.format('Error was occur while data check %s', err.message), module);
        });
}

module.exports = {
    /**
     * Initialize cron job for commit and push tasks perform
     */
    init: function () {
        //initialize or open leveldb database
        levelDb.init();

        //initialize and auth for gh API
        githubApi.init();

        job = new CronJob({
            //cronTime: '0 */1 * * * *',
            cronTime: '*/30 * * * * *',
            onTick: execute,
            start: true
        });
    }
};
