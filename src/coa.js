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
        .cmd().name('server').apply(require('./commands/server')).end()
        .cmd().name('sync-docs').apply(require('./commands/sync-docs')).end()
        .cmd().name('sync-nodes').apply(require('./commands/sync-nodes')).end()
        .cmd().name('sync-people').apply(require('./commands/sync-people')).end()
        .cmd().name('sync-libraries').apply(require('./commands/sync-libraries')).end()
        .completable();
}

module.exports = command();
