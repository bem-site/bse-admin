'use strict';

var fs = require('fs'),
    path = require('path'),
    vowFs = require('vow-fs'),

    logger = require('../logger'),

    MODEL_PATH = path.join(process.cwd(), 'cache', 'model/model.json');

module.exports = function (req, res) {
    return vowFs.makeDir(MODEL_PATH).then(function () {
        req.pipe(fs.createWriteStream(MODEL_PATH))
            .on('error', function (err) {
                res.status(500).send('error ' + err);
            })
            .on('end', function () {
                logger.debug('new model has been received', module);
                res.status(200).send('ok');
            });
    });
};
