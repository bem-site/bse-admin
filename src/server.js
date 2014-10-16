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
        .get('/ping/:environment', controllers.ping)
        .get('/data/:environment', controllers.data)
        .get('/set/:environment/:version', controllers.set)
        .listen(app.get('port'), function () {
            logger.info(util.format('Express server listening on port %s', app.get('port')), module);
        });
    return app;
};
