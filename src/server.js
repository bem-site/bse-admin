'use strict';

var util = require('util'),

    express = require('express'),
    st = require('serve-static'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    session = require('session'),
    flash = require('connect-flash'),

    auth = require('./auth'),
    config = require('./config'),
    logger = require('./logger'),
    template = require('./template'),
    controllers = require('./controllers');

/**
 * Starts express server
 */
module.exports = function () {
    auth.init();

    var app = express();
    app.set('port', config.get('server:port') || 3000);

    if (config.get('NODE_ENV') === 'development') {
        app.use(require('enb/lib/server/server-middleware').createMiddleware({
            cdir: process.cwd(),
            noLog: false
        }));
    }

    app
        .use(st(process.cwd()))
        .use(function (req, res, next) {
            logger.debug(util.format('retrieve request %s', req.path), module);
            next();
        })
        .use(cookieParser())
        .use(bodyParser.json())
        .use(methodOverride('X-HTTP-Method-Override'))
        .use(session({ secret: 'keyboard cat' }))
        .use(flash())
        .use(auth.getPassport().initialize())
        .use(auth.getPassport().session())
        .get('/', controllers.index)
        .get('/ping/:environment', controllers.ping)
        .get('/data/:environment', controllers.data)
        .get('/set/:environment/:version', auth.ensureAuthenticated, controllers.set)
        .get('/remove/:version', auth.ensureAuthenticated, controllers.delete)
        .get('/changes/:version', controllers.changes)
        .get('/search/:environment/ping', controllers.search.ping)
        .get('/search/:environment/libraries', controllers.search.libraries)
        .get('/search/:environment/blocks', controllers.search.blocks)
        .post('/model', controllers.model)
        .post('/login', auth.authenticate('/login'), function (req, res) { res.redirect('/'); })
        .get('/logout', function (req, res) {
            req.logout();
            res.redirect('/');
        })
        .listen(app.get('port'), function () {
            logger.info(util.format('Express server listening on port %s', app.get('port')), module);
            template.init({ level: 'common', bundle: 'index' });
        });
    return app;
};
