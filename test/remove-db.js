var path = require('path'),
    fsExtra = require('fs-extra');

fsExtra.remove(path.join(process.cwd(), 'db', 'leveldb'), function (err) {
    if(err) {
        console.error('Directory removing error');
    }

    console.info('Database directory has been removed successfully');
});
