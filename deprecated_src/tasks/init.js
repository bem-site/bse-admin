var path = require('path'),
    vow = require('vow'),

    mds = require('../providers/mds'),
    mailer = require('../providers/mailer'),
    yandexDisk = require('../providers/yandex-disk'),
    githubApi = require('../providers/github'),
    levelDb = require('../providers/level-db');

module.exports = function (target) {
    return vow.all([
            mds.init(target.getOptions()['mds']),
            mailer.init(target.getOptions()['mailer']),
            yandexDisk.init(target.getOptions()['yandex-disk']),
            githubApi.init(target.getOptions()['github']),
            levelDb.init(path.join(process.cwd(), 'db'))
       ]).then(function () {
          return vow.resolve(target);
       });
};
