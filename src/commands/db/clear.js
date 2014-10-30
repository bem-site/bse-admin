var logger = require('../../logger'),
    TargetClearDb = require('../../targets/clear-db').TargetClearDb;

// TODO add options for remove only records with prefixes given by command options

module.exports = function () {
    return this
        .title('removes all data from database')
        .helpful()
        .act(function () {
            logger.info('Try to clear all data in database', module);
            return (new TargetClearDb()).execute();
        });
};
