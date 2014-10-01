var util = require('util'),

    CronJob = require('cron').CronJob,

    config = require('./config'),
    logger = require('./logger'),
    providers = require('./providers'),

    job;

function execute () {
    logger.info('-- check for data start --', module);
    return require('./model/versions')()
        .then(require('./model/people'));
}

module.exports = {
    /**
     * Initialize cron job for commit and push tasks perform
     */
    init: function () {
        //initialize leveldb database
        providers.getProviderLevelDB();

        job = new CronJob({
            //cronTime: '0 */1 * * * *',
            cronTime: '*/10 * * * * *',
            onTick: execute,
            start: true
        });
    }
};
