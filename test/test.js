var util = require('util'),
    colors = require('colors'),
    levelDb = require('../src/level-db');

levelDb.init();
setTimeout(function () {

    levelDb.getDb().createReadStream()
        .on('data', function (data) {
            var key = data.key,
                value = JSON.parse(data.value);

            // var criteria = value && value.source && value.source.data &&
                // value.source.data.indexOf('2be88ca4242c76e8253ac62474851065032d6833') > -1;
            var criteria = key.indexOf('nodes:') > -1 && value.level === 0;
            // var criteria = key.indexOf('docs:') > -1;
            // var criteria = key.indexOf('urls:') > -1;
            if (criteria) {
                console.log(util.format('key: %s', key).green);
                console.log(util.format('value: %s', JSON.stringify(value)).cyan);
                console.log('\n');
            }
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
