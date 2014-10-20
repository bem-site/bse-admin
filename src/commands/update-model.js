var logger = require('../logger'),
    TargetUpdateModel = require('../targets/update-model').TargetUpdateModel;

module.exports = function () {
    return this
        .title('sends updated model file to remote host')
        .helpful()
        .opt()
            .name('url').title('Url for send model archive file')
            .short('u').long('url')
            .req()
            .end()
        .act(function (opts) {
            logger.info('Try to compile and send model file', module);
            return (new TargetUpdateModel(opts)).execute();
        });
};
