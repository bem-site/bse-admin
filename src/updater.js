var CronJob = require('cron').CronJob,

    logger = require('./logger'),
    TargetNodes = require('./targets/nodes').TargetNodes,

    job,
    state,

    STATE = {
        IDLE: 0,
        ACTIVE: 1
    };

function setIdle() {
    state = STATE.IDLE;
}

function setActive() {
    state = STATE.ACTIVE;
}

function isActive() {
    return state === STATE.ACTIVE;
}

function execute () {
    logger.info('=== CRON CHECK FOR DATA START ===', module);

    if (isActive()) {
        logger.warn('Previous synchronization process was not completed yet', module);
        return;
    }

    setActive();
    return (new TargetNodes({})).execute()
        .then(function () {
            setIdle();
            logger.info('=== CRON CHECK FOR DATA END ===', module);
        })
        .fail(function () {
            setIdle();
            logger.error('=== CRON CHECK FOR DATA ERROR ===', module);
        });
}

module.exports = {
    /**
     * Initialize cron job for commit and push tasks perform
     */
    init: function () {
        state = STATE.IDLE;
        job = new CronJob({
            cronTime: '0 */1 * * * *',
            onTick: execute,
            start: true
        });
    }
};
