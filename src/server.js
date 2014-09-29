'use strict';

var util = require('util'),

    express = require('express'),

    config = require('./config'),
    logger = require('./logger'),
    controllers = require('./controllers');

/**
 * Starts express server
 */
module.exports = function () {
    var app = express();
    app.set('port', config.get('server:port') || 3000);

    app
        .use(function (req, res, next) {
            logger.debug(util.format('retrieve request %s', req.path), module);
            next();
        })
        .get('/', controllers.index)
        .post('/testing/:version', controllers.testing)
        .post('/production/:version', controllers.production)
        .post('/update-model', controllers.updateModel)
        .post('/update-people', controllers.updatePeople)
        .listen(app.get('port'), function () {
            logger.info(util.format('Express server listening on port %s', app.get('port')), module);
        });
    return app;
};
