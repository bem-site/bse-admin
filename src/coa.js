'use strict';

var util = require('util'),
    logger = require('./logger');

function command() {
    return require('coa').Cmd()
        .name(process.argv[1])
        .title('Library data builder')
        .helpful()
        .opt()
            .name('version').title('Show version')
            .short('v').long('version')
            .flag()
            .only()
        .act(function () {
            var p = require('../package.json');
            logger.info(util.format('application name: %s version %s', p.name, p.version), module);
            return '';
        })
        .end()
        .cmd().name('sync-nodes').apply(require('./commands/sync/nodes')).end()
        .cmd().name('clear-db').apply(require('./commands/db/clear')).end()
        .cmd().name('view-db').apply(require('./commands/db/view')).end()
        .cmd().name('update-model').apply(require('./commands/update-model')).end()
        .completable();
}

module.exports = command();
