var vow = require('vow'),
    githubApi = require('../gh-api'),
    levelDb = require('../level-db');

module.exports = function (target) {
    return vow.all([
        githubApi.init(),
        levelDb.init()
    ]).then(function () {
        return vow.resolve(target);
    });
};
