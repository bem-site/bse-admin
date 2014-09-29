'use strict';

var util = require('util'),
    logger = require('../logger');

exports.index = function(req, res) {
    logger.info(util.format('index controller action %s', req.path), module);
    res.status(200).end('OK');
};

exports.testing = require('./testing');
exports.production = require('./production');
exports.updateModel = require('./update-model');
exports.updatePeople = require('./update-people');
