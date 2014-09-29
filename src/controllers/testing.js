'use strict';

var util = require('util'),
    logger = require('../logger');

module.exports = function(req, res) {
    logger.info(util.format('testing controller action %s', req.path), module);
    res.status(200).end('OK');
};
