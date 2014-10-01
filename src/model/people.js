'use strict';

var util = require('util'),
    path = require('path'),

    logger = require('../logger'),
    config = require('../config'),
    constants = require('../constants'),
    providers = require('../providers'),

    repo = (function() {
        var pr = config.get('github:people');
        if(!pr) {
            logger.warn('Path to people data file has not been set in application configuration', module);
            return null;
        }

        pr = pr.match(/^https?:\/\/(.+?)\/(.+?)\/(.+?)\/(tree|blob)\/(.+?)\/(.+)/);
        if (!pr) {
            logger.warn('Path to people repository has invalid format', module);
            return null;
        }

        pr = {
            host: pr[1],
            user: pr[2],
            repo: pr[3],
            ref:  pr[5],
            path: pr[6]
        };
        pr.type = pr.host.indexOf('github.com') > -1 ? 'public' : 'private';
        return pr;
    })();

//
//function People() {
//    logger.info('Initialize people model', module);

//}
//
//People.prototype = Object.create(Base.prototype);
//
//People.prototype._GH_PATTERN = /^https?:\/\/(.+?)\/(.+?)\/(.+?)\/(tree|blob)\/(.+?)\/(.+)/;
//People.prototype._FILE_PATH = path.join(constants.DIRECTORY.MODEL, 'people.json');
//People.prototype._peopleRepository = undefined;
//
///** PRIVATE METHODS **/
//People.prototype._import = function () {
//    logger.info('Load all people from remote repository', module);
//    if(!this._peopleRepository) {
//        return null;
//    }
//
//    return providers.getProviderGhApi().load({ repository: this._peopleRepository })
//        .then(function(result) {
//            logger.info('People successfully loaded', module);
//            return (new Buffer(result.res.content, 'base64')).toString();
//        })
//        .then(function (content) {
//            try {
//                this._data = JSON.parse(content);
//            } catch (err) {
//                this._data = {};
//            }
//            return this;
//        }, this)
//        .then(this._save, this)
//        .fail(function (err) {
//            logger.error(util.format('Error while loading people %s', err), module);
//            return null;
//        }, this);
//};
//
//module.exports = People;

function checkIfPeopleDataWasChanged() {

}

function removeOldPeopleData() {

}

function loadPeopleDataFromGithub() {

}

function updatePeopleDataInDb() {

}

module.exports = function() {
    logger.info('Check if people data was changed start', module);
};
