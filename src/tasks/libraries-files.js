'use strict';

var fs = require('fs'),
    util = require('util'),
    path = require('path'),

    _ = require('lodash'),
    vow = require('vow'),
    fsExtra = require('fs-extra'),

    logger = require('../logger'),
    errors = require('../errors').TaskLibrariesFiles,
    storage = require('../providers/mds');

module.exports = {

    /**
     * Returns path to cached "registry.json" file on local filesystem
     * @param {TargetBase} target object
     * @returns {String} path
     * @private
     */
    _getMDSRegistryFilePath: function (target) {
        return path.join(target.LIBRARIES_FILE_PATH, 'registry.json');
    },

    /**
     * Returns path for saving library version data file from mds storage into cache folder
     * @param {TargetBase} target object
     * @param {String} lib - name of library
     * @param {String} version - name of library version
     * @returns {String} path
     * @protected
     */
    _getLibVersionPath: function (target, lib, version) {
        return path.join(target.LIBRARIES_FILE_PATH, lib, version);
    },

    /**
     * Loads JSON registry file from remote MDS source
     * @param {TargetBase} target object
     * @returns {Promise}
     * @private
     */
    _getRegistryFromCache: function (target) {
        // загружаем файл реестра из кеша с локальной файловловой системы
        // если такого файла нет, то локальный реестр считается пустым
        return new vow.Promise(function (resolve) {
            fsExtra.readJSON(this._getMDSRegistryFilePath(target), function (error, content) {
                return resolve((error || !content) ? {} : content);
            });
        }.bind(this));
    },

    /**
     * Loads JSON registry file from local cache
     * @returns {Promise}
     * @private
     */
    _getRegistryFromMDS: function () {
        var REGISTRY_MDS_KEY = 'root';

        // загружаем файл реестра с MDS хранилища с помощью MDS API
        // по url: http://{mds host}:{mds port}/get-{mds namespace}/root
        return new vow.Promise(function (resolve) {
            storage.get().read(REGISTRY_MDS_KEY, function (error, content) {
                if (error || !content) {
                    logger.error(error ? error.message : 'Registry was not found or empty', module);
                    logger.warn('Can not load registry file from MDS storage. ' +
                    'Please verify your mds settings. Registry will be assumed as empty', module);
                    return resolve({});
                }
                resolve(JSON.parse(content));
            });
        });
    },

    /**
     * Creates Map instance with complex keys built as combination of library and version names
     * {lib}||{version} and object values which contains sha sums and build dates
     * @param {Object} registry object
     * @returns {Object} - comparator map
     * @private
     */
    _createComparatorMap: function (registry) {
        // Для поиска различий между объекстами реестров построить объект класса Map
        // в котором в качестве ключей будут уникальные сочетания названий библиотек и версий
        // а в качестве значений - объекты в которых хранятся поля по которым можно проверить
        // изменились ли данные для версии библиотеки или нет (sha-сумма и дата сборки в миллисекундах)
        return Object.keys(registry).reduce(function (prev, lib) {
            var versions = registry[ lib ].versions;
            if (versions) {
                Object.keys(versions).forEach(function (version) {
                    prev[ util.format('%s||%s', lib, version) ] = versions[ version ];
                });
            }
            return prev;
        }, {});
    },

    /**
     * Compare registry objects loaded from local filesystem and remote mds host
     * Finds differences between them and fills model changes structure
     * @param {TargetBase} target object
     * @param {Object} local - registry object loaded from local filesystem
     * @param {Object} remote - registry object loaded from remote MDS host
     * @returns {{added: Array, modified: Array, removed: Array}}
     * @private
     */
    _compareRegistryFiles: function (target, local, remote) {
        var localCM = this._createComparatorMap(local),
            remoteCM = this._createComparatorMap(remote),
            added = [],
            modified = [],
            removed = [],
            processItem = (function (key, collection, type) {
                var k = key.split('||'),
                    item = {lib: k[ 0 ], version: k[ 1 ]};
                logger.debug(util.format('%s lib: => %s version: => %s', type, item.lib, item.version), module);
                target.getChanges().getLibraries()[ 'add' + type ](item);
                collection.push(item);
            }).bind(this);

        // происходит итерация по ключам Map построенного для реестра загруженного с MDS хоста
        // если локальный Map не содержит сочетания {lib}||{version}, то версия {version} библиотеки
        // {lib} считается добавленной (новой)
        Object.keys(remoteCM).forEach(function (key) {
            !localCM[ key ] && processItem(key, added, 'Added');
        });

        // если ключи {lib}||{version} присутствуют в обоих Map объектах, то сравниваются значения
        // для этих ключей. Если sha-суммы или даты сборки не совпадают, то версия {version} библиотеки
        // {lib} считается модифицированной (измененной)
        Object.keys(remoteCM).forEach(function (key) {
            if (localCM[ key ]) {
                var vLocal = localCM[ key ],
                    vRemote = remoteCM[ key ];
                if (vLocal[ 'sha' ] !== vRemote[ 'sha' ] || vLocal[ 'date' ] !== vRemote[ 'date' ]) {
                    processItem(key, modified, 'Modified');
                }
            }
        });

        // происходит итерация по ключам Map построенного для реестра загруженного с локальной файловой системы
        // если Map загруженный с MDS не содержит сочетания {lib}||{version}, то версия {version} библиотеки
        // {lib} считается удаленной
        Object.keys(localCM).forEach(function (key) {
            !remoteCM[ key ] && processItem(key, removed, 'Removed');
        });

        return {added: added, modified: modified, removed: removed};
    },

    /**
     * Downloads library version data.json file from MDS storage to local filesystem
     * @param {Object} item
     * @param {String} item.lib - name of library
     * @param {String} item.version - name of library version
     * @param {TargetBase} target object
     * @returns {Promise}
     * @private
     */
    _saveLibraryVersionFile: function (item, target) {
        var lib = item.lib,
            version = item.version,
            onError = function (error, lib, version) {
                logger.error(error.message, module);
                logger.error(util.format('Error occur while loading "data.json" file from MDS ' +
                        'for library: %s and version: %s', lib, version), module);
            };

        logger.debug(util.format('Load file for library: %s and version: %s', lib, version), module);

        // загружается файл с MDS хранилища по url:
        // http://{mds host}:{mds port}/{get-namespace}/{lib}/{version}/data.json
        // сохраняется на файловую систему по пути:
        // {директория кеша}/{baseUrl|libs}/{lib}/{version}/mds.data.json
        return new vow.Promise(function (resolve, reject) {
            fsExtra.ensureDir(this._getLibVersionPath(target, lib, version), function () {
                storage.get().read(util.format('%s/%s/data.json', lib, version), function (error, content) {
                    if (!error) {
                        fs.writeFile(path.join(this._getLibVersionPath(target, lib, version), 'data.json'),
                            content, { encoding: 'utf-8' }, function (error) {
                            if (!error) {
                                resolve(item);
                            } else {
                                onError(error, lib, version);
                                reject(error);
                            }
                        });
                    } else {
                        onError(error, lib, version);
                        reject(error);
                    }
                }.bind(this));
            }.bind(this));
        }.bind(this));
    },

    /**
     * Removes library version folder from cache on local filesystem
     * @param {Object} item
     * @param {String} item.lib - name of library
     * @param {String} item.version - name of library version
     * @param {TargetBase} target object
     * @returns {Promise}
     * @private
     */
    _removeLibraryVersionFolder: function (item, target) {
        var lib = item.lib,
            version = item.version;

        logger.debug(util.format('Remove "data.json" file for library: %s and version: %s', lib, version), module);

        return new vow.Promise(function (resolve, reject) {
            fsExtra.remove(this._getLibVersionPath(target, lib, version), function (error) {
                if (!error) {
                    return resolve(item);
                }
                logger.error(error.message, module);
                logger.error('Error occur while remove library version mds.data.json file from cache' +
                'for library: ' + lib + ' and version: ' + version, module);
                reject(error);
            });
        }.bind(this));
    },

    run: function (target) {
        // создаем директорию ./cache/libraries если ее еще нет на файловой системе
        fsExtra.ensureDirSync(target.LIBRARIES_FILE_PATH);

        var _remote;

        return vow
            .all([
                this._getRegistryFromCache(target), // загружаем реестр с локальной файловой системы
                this._getRegistryFromMDS() // загружаем реестр с удаленного MDS хоста
            ])
            .spread(function (local, remote) {
                _remote = remote;
                return this._compareRegistryFiles(target, local, remote); // сравниваем реестры, находим дифф
            }.bind(this))
            .then(function (diff) {
                // формируем списки на удаление директорий версий библиотек
                // и на скачивание обновленных data.json файлов версий библиотек с MDS хранилища
                return vow.all([
                    vow.resolve([].concat(diff.added).concat(diff.modified)),
                    vow.resolve([].concat(diff.removed).concat(diff.modified))
                ]);
            })
            .spread(function (downloadQueue, removeQueue) {
                // удаляем папки измененных и удаленных версий библиотек с локальной файловой системы
                return vow
                    .all(removeQueue.map(function (item) {
                        return this._removeLibraryVersionFolder(item, target);
                    }, this))
                    .then(function () {
                        return downloadQueue;
                    });
            }.bind(this))
            .then(function (downloadQueue) {
                // порциями по 5 штук загружаем обновленные data.json файлы
                // и складываем их на файловую систему
                var portions = _.chunk(downloadQueue, 5);
                return portions.reduce(function (prev, portion) {
                    return prev.then(function () {
                        return vow.all(portion.map(function (item) {
                            return this._saveLibraryVersionFile(item, target);
                        }, this));
                    }, this);
                }.bind(this), vow.resolve());
            }, this)
            .then(function () {
                return new vow.Promise(function (resolve) {
                    fsExtra.writeJSON(this._getMDSRegistryFilePath(target), _remote, function (error) {
                        if (error) {
                            logger.error('Error occur on saving MDS registry file', module);
                            logger.error(util.format('Error: %s', error.message), module);
                        }
                        logger.debug('MDS Registry file has been successfully replaced', module);
                        resolve();
                    });
                }.bind(this));
            }, this)
            .then(function () {
                logger.info('Libraries were synchronized successfully with cache on local filesystem', module);
                return vow.resolve(target);
            })
            .fail(function (err) {
                logger.error('Error occur: ' + err.message, module);
                return vow.reject(err);
            });
    }
};
