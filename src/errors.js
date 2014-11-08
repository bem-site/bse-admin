var Terror = require('terror'),
    logger = require('./logger'),
    log = function (message, level) {
        logger[level](message, module);
    };

module.exports = {
    Util: Terror
        .create('UtilError', {
            REMOVE_DIR: [ 50, 'Remove directory failed with error %err%' ],
            COPY_DIR: [ 51, 'Copy directory failed with error %err%' ],
            LOAD_FROM_URL_TO_FILE: [ 52, 'Error occur while loading from url %url% to file %file%' ]
        }).setLogger(log),

    LevelDB: Terror
        .create('LevelDbError', {
            INIT: [ 60, 'Can not connect to database. Error: %err%' ],
            PUT: [ 61, 'Error occur while on put key %key%. Error: %err%' ],
            GET: [ 62, 'Error occur while on get key %key%. Error: %err%' ],
            DEL: [ 63, 'Error occur while on del key %key%. Error: %err%' ],
            BATCH: [ 64, 'Error occur on batch operations. Error: %err%' ],
            GET_BY_CRITERIA: [ 65, 'Error occur while getting data by criteria. Error: %err%' ]
        }).setLogger(log),

    TaskClearDB: Terror
        .create('ClearDbError', {
            COMMON: [ 110, 'Database clear failed with error %err%' ]
        }).setLogger(log),

    TaskSwitchSymlink: Terror
        .create('SwitchSymlinkError', {
            COMMON: [ 120, 'Switch symlink failed with error %err%' ]
        }).setLogger(log),

    TaskUrlsMap: Terror
        .create('UrlsMapError', {
            COMMON: [ 130, 'Urls map creation failed with error %err%' ]
        }).setLogger(log),

    TaskUpdateModel: Terror
        .create('UpdateModelError', {
            COMMON: [ 140, 'Sending model failed with error %err%' ],
            STREAMING: [ 141, 'Streaming model failed with error %err%' ]
        }).setLogger(log),

    TaskSnapshot: Terror
        .create('SnapshotError', {
            COMMON: [ 150, 'Database snapshot creation failed with error %err%' ]
        }).setLogger(log),

    TaskSitemapXML: Terror
        .create('SitemapXML', {
            COMMON: [ 160, 'Creation of sitemap.xml file failed with error %err%' ]
        }).setLogger(log),

    TaskPeople: Terror
        .create('People', {
            COMMON: [ 170, 'People data synchronization failed with error %err%' ],
            PATH_NOT_SET: [171, 'Path to people data file has not been set in application configuration'],
            PATH_INVALID: [172, 'Path to people repository has invalid format'],
            PARSING: [173, 'Error occur while parsing people data']
        }).setLogger(log),

    TaskDynamicPeople: Terror
        .create('DynamicPeople', {
            COMMON: [ 180, 'Creation of dynamic nodes for people failed with error %err%' ]
        }).setLogger(log),

    TaskDynamicTags: Terror
        .create('DynamicTags', {
            COMMON: [ 190, 'Creation of dynamic nodes for tags failed with error %err%' ]
        }).setLogger(log),

    TaskGetJsModel: Terror
        .create('GetJsModel', {
            COMMON: [ 200, 'No js model were found or error %err% occur' ]
        }).setLogger(log),

    TaskLibrariesFiles: Terror
        .create('LibrariesFiles', {
            COMMON: [ 210, 'Libraries synchronization with cache failed with error %err%' ],
            LIBRARIES_REPO_NOT_SET: [211, 'Libraries repository was not set in configuration'],
            LIBRARIES_REPO_TYPE_NOT_SET: [212, 'Type of libraries repository was not set in configuration'],
            LIBRARIES_REPO_USER_NOT_SET: [213, 'User field of libraries repository was not set in configuration'],
            LIBRARIES_REPO_NAME_NOT_SET: [214, 'Name of libraries repository was not set in configuration'],
            LIBRARIES_REPO_REF_NOT_SET: [215, 'Reference of libraries repository was not set in configuration'],
            LIBRARIES_REPO_PATTERN_NOT_SET: [216, 'Pattern for libraries repository was not set in configuration']
        }).setLogger(log)
};
