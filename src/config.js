'use strict';

var path = require('path'),
    nconf = require('nconf');

/**
 * Application configuration module based on nconf library
 */
module.exports = (function () {
    nconf
        .env()
        .file({ file: path.resolve(process.cwd(), 'configs/config.json') });

    nconf.add('app', {
        type: 'file',
        file: path.resolve(process.cwd(), 'configs/common/app.json')
    });

    return nconf;
})();
