'use strict';

var vow = require('vow'),

    logger = require('../logger'),
    levelDb = require('../level-db');

module.exports = function() {
    logger.info('Check for versions start', module);

    return levelDb.get('versions')
        .then(function() {
            logger.info('Versions were checked successfully', module);
        })
        .fail(function(err) {
            if('NotFoundError' === err.name) {
                logger.warn('Versions are not exists yet. Will be created', module);
                return levelDb.put('versions', {
                    people: null,
                    nodes: null
                });
            }
            return vow.fulfill();
        });
};
