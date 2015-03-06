'use strict';

var path = require('path');

module.exports = {
    DIRECTORY: {
        CACHE: path.join(process.cwd(), 'cache'),
        MODEL: path.join(process.cwd(), 'model')
    },
    FILE: {
        MODEL: 'model.json'
    },
    GITHUB: {
        PRIVATE: 'github.yandex-team.ru',
        PUBLIC: 'github.com'
    },
    REGISTRY_KEY: 'root'
};
