var vow = require('vow'),
    config = require('../config'),

    mds = require('../providers/mds'),
    mailer = require('../providers/mailer'),
    yandexDisk = require('../providers/yandex-disk'),
    githubApi = require('../providers/github'),
    levelDb = require('../providers/level-db');

module.exports = function (target) {
    return vow.all([
        mds.init(config.get('mds')),
        mailer.init(config.get('mailer')),
        yandexDisk.init(config.get('yandex-disk')),
        githubApi.init(config.get('github')),
        levelDb.init()
   ]).then(function () {
        return vow.resolve(target);
    });
};
