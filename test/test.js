var providers = require('../src/providers');

providers.getProviderLevelDB();


setTimeout(function() {
    providers.getProviderLevelDB().getDb().createReadStream()
        .on('data', function (data) {
            console.log('key: %s value: %s', data.key, JSON.stringify(data.value));
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

