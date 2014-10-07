var util = require('util'),
    colors = require('colors'),
    levelDb = require('../src/level-db');

levelDb.init();


setTimeout(function() {

    levelDb.getDb().createReadStream()
        .on('data', function (data) {
            console.log(util.format('key: %s', data.key).green);
            console.log(util.format('value: %s', data.value).cyan)  ;

            console.log('\n');
        })
        .on('error', function (err) {
            console.error('error stream' + err.message);
        })
        .on('close', function () {
            console.log('close stream');
        })
        .on('end', function () {
            console.log('end stream');
        });
}, 1000);

