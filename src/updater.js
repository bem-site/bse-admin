var util = require('util'),

    vow = require('vow'),
    CronJob = require('cron').CronJob,

    config = require('./config'),
    logger = require('./logger'),
    providers = require('./providers'),

    job;

function execute () {
    logger.info('-- check for data start --', module);
    return vow.resolve()
        .then(require('./checkers/versions'))
        .then(require('./checkers/people'))
        .then(require('./checkers/libraries'));
}

module.exports = {
    /**
     * Initialize cron job for commit and push tasks perform
     */
    init: function () {
        //initialize or open leveldb database
        providers.getProviderLevelDB();

        job = new CronJob({
            //cronTime: '0 */1 * * * *',
            cronTime: '*/30 * * * * *',
            onTick: execute,
            start: true
        });
    }
};
