'use strict';

var util = require('util'),
    path = require('path'),

    fstream = require('fstream'),
    request = require('request'),
    tar = require('tar'),

    logger = require('../logger'),
    utility = require('../util'),

    DB_PATH = path.join(process.cwd(), 'db');

module.exports = function(req, res) {
    var environment = req.params.environment || 'testing';
    logger.info(util.format('data controller action %s with params: %s', req.path, environment), module);

    res.status(200).end('OK');
};
