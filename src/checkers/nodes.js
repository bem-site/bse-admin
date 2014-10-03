'use strict';

var util = require('util'),
    path = require('path'),

    _ = require('lodash'),
    vow = require('vow'),

    logger = require('../logger'),
    providers = require('../providers/index'),
    Nodes = require('../model/nodes.js'),

    CACHE_DIR = path.join(process.cwd(), 'cache', 'model'),
    MODEL_FILE_PATH = path.join(CACHE_DIR, 'model.json');

function checkForNewModel() {
    return providers.getProviderFile().exists({ path: MODEL_FILE_PATH })
        .then(function(exists) {
            return exists ?
                vow.resolve() :
                vow.reject('There no updated model file. This step will be skipped');
        })
        .then(function() {
            return providers.getProviderFile().isFile({ path: MODEL_FILE_PATH });
        })
        .then(function(isFile) {
            return !isFile ?
                vow.resolve() :
                vow.reject('Model file is not file. This step will be skipped');
        });
}

function loadNewModel() {
    logger.warn('Updated model was found. Start to load and parse it', module);

    return providers.getProviderFile().load({ path: MODEL_FILE_PATH }).then(function(content) {
        try {
            return JSON.parse(content);
        } catch (err) {
            var error = 'Error while parsing model';
            logger.error(error, module);
            return vow.reject(error);
        }
    });
}

function processNewModel(content) {
    var nodes;
    try {
        nodes = new Nodes(content);
    } catch (err) {
        return vow.reject(err);
    }
}

module.exports = function() {
    logger.info('Check if model data was changed start', module);
    return checkForNewModel()
        .then(loadNewModel)
        .then(processNewModel)
        .fail(function(err) {
            logger.warn(err, module);
        });
};
