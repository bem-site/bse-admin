var logger = require('../logger'),
    TargetUpdateModel = require('../targets/update-model').TargetUpdateModel;

module.exports = function () {
    return this
        .title('sends updated model file to remote host')
        .helpful()
        .opt()
            .name('host').title('Host of data provider service')
            .short('h').long('host')
            .end()
        .opt()
            .name('port').title('Port of data provider service')
            .short('p').long('port')
            .end()
        .act(function (opts) {
            logger.info('Try to compile and send model file', module);
            return (new TargetUpdateModel(opts)).execute();
        });
};
