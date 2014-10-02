var util = require('util'),
    fs = require('fs'),

    vow = require('vow'),
    request = require('request'),
    logger = require('../logger');

exports.GhHttpsProvider = function() {

    this._getUrl = function(type) {
        return {
            'public': 'https://raw.githubusercontent.com/%s/%s/%s/%s',
            'private': 'https://github.yandex-team.ru/%s/%s/raw/%s/%s'
        }[type];
    };

    /**
     * @param options
     * @returns {*}
     */
    this.loadFromRepoToFile = function(options) {
        var def = vow.defer(),
            repo = options.repository,
            file = options.file,
            url = util.format(this._getUrl(repo.type), repo.user, repo.repo, repo.ref, repo.path);

        request.get(url).pipe(fs.createWriteStream(file))
            .on('error', function(err) {
                logger.error(util.format('Error occur while loading from url %s to file %s', url, file), module);
                def.reject(err);
            })
            .on('close', function() {
                logger.debug(util.format('Success loading from url %s to file %s', url, file), module);
                def.resolve();
            });
        return def.promise();
    };
};
