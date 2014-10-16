var luster = require('luster'),
    config = require('./config');

//if (luster.isMaster) {
    //TODO implement updater launch here
//}

luster.configure({
    app : 'worker.js',
    workers : 2,
    control : {
        forkTimeout : 1000,
        stopTimeout : 1000,
        exitThreshold : 3000,
        allowedSequentialDeaths : 3
    },
    server : {
        port : config.get('server:port')
    }
}, true, __dirname).run();
