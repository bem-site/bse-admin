var util = require('util'),

    vow = require('vow'),
    CronJob = require('cron').CronJob,

    logger = require('./logger'),
    levelDb = require('./level-db'),
    githubApi = require('./gh-api'),
    Changes = require('./model/changes'),

    //NodesSynchronizer = require('./synchronizers/nodes').NodesSynchronizer,
    //DocsSynchronizer = require('./synchronizers/docs').DocsSynchronizer,
    //PeopleSynchronizer = require('./synchronizers/people').PeopleSynchronizer,
    //LibrariesSynchronizer = require('./synchronizers/libraries').LibrariesSynchronizer,

    job;

function execute () {
    logger.info('=== check for data start ===', module);
    //var changes = new Changes(),
    //    nodesSynchronizer = new NodesSynchronizer(),
    //    docsSynchronizer = new DocsSynchronizer(),
    //    peopleSynchronizer = new PeopleSynchronizer(),
    //    librariesSynchronizer = new LibrariesSynchronizer();
    //
    //return vow.resolve(changes)
    //    .then(nodesSynchronizer.executeFromCron)
    //    .then(docsSynchronizer.executeFromCron)
    //    .then(peopleSynchronizer.executeFromCron)
    //    .then(librariesSynchronizer.executeFromCron)
    //    .then(function(changes) {
    //        //TODO implement override links , create sitemap.xml file and database snapshot
    //        return vow.resolve(changes);
    //    })
    //    .then(function() {
    //        logger.info('=== check for data end ===', module);
    //    })
    //    .fail(function(err) {
    //        logger.error(util.format('Error was occur while data check %s', err.message), module);
    //    });
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
