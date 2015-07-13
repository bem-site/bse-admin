var fs = require('fs'),
    path = require('path'),
    vow = require('vow'),
    should = require('should'),
    MDS = require('mds-wrapper'),
    fsExtra = require('fs-extra'),
    emulator = require('mds-wrapper/mds-emulator.js'),
    storage = require('../../src/providers/mds'),
    Target = require('../../src/targets/nodes'),
    task = require('../../src/tasks/libraries-files');

describe('libraries-files', function () {
    describe('methods', function () {
        var target, testAPI, cacheFolder;

        before(function () {
            var o = {
                "auth": "test auth string",
                namespace: 'mysite',
                get: { host: '127.0.0.1', port: 3000 },
                post: { host: '127.0.0.1', port: 3001 }
            };
            storage.init(o);
            testAPI = new MDS(o);
        });

        beforeEach(function () {
            target = new Target({});
            cacheFolder = path.join(process.cwd(), './cache');
            fsExtra.mkdirsSync(cacheFolder);
        });

        afterEach(function () {
            fsExtra.removeSync(cacheFolder);
        });

        describe('_getMDSRegistryFilePath', function () {
            it('should return valid path to MDS registry file in cache', function () {
                task._getMDSRegistryFilePath(target)
                    .should.equal(path.join(cacheFolder, './libraries/registry.json'));
            });
        });

        describe('_getRegistryFromCache', function () {
            it('should read registry from cache', function () {
                var p1 = path.join(cacheFolder, './libraries'),
                    p2 = path.join(process.cwd(), './test/fixtures/registry.json');
                fsExtra.ensureDirSync(p1);
                fsExtra.copySync(p2, path.join(p1, 'registry.json'));

                return task._getRegistryFromCache(target).then(function (result) {
                    should.deepEqual(result, fsExtra.readJSONSync(p2));
                });
            });

            it('should return empty registry if file does not exist in cache', function () {
                var p1 = path.join(cacheFolder, './libraries');
                fsExtra.ensureDirSync(p1);

                return task._getRegistryFromCache(target).then(function (result) {
                    should.deepEqual(result, {});
                });
            });
        });

        describe('_getRegistryFromMDS', function () {
            before(function (done) {
                emulator.start(3000, 3001);
                setTimeout(done, 300);
            });

            it('should return empty object if registry was not loaded from MDS', function () {
                return task._getRegistryFromMDS().then(function (result) {
                    should.deepEqual(result, {});
                });
            });

            it('should return registry file from mds', function () {
                var registryFilePath = path.join(process.cwd(), './test/fixtures/registry.json'),
                    registry = fsExtra.readJSONSync(registryFilePath);

                return testAPI.writeP('root', JSON.stringify(registry)).then(function () {
                    return task._getRegistryFromMDS().then(function (result) {
                        should.deepEqual(result, registry);
                    });
                })
            });

            after(function (done) {
                emulator.stop();
                setTimeout(done, 300);
            });
        });

        describe('_createComparatorMap', function () {
            it('should create comparator map', function () {
                var registryFilePath = path.join(process.cwd(), './test/fixtures/registry.json'),
                    registry = fsExtra.readJSONSync(registryFilePath),
                    comparatorMap = task._createComparatorMap(registry);

                comparatorMap['bem-core||v2'].should.be.instanceOf(Object);
                should.deepEqual(comparatorMap['bem-core||v2'], {
                    sha: 'a25b147f254ee8e46c26031886f243221dc3d35f',
                    date: 1432047899246
                });

                comparatorMap['bem-bl||dev'].should.be.instanceOf(Object);
                should.deepEqual(comparatorMap['bem-bl||dev'], {
                    sha: '3b7998cc3be75d7ef3235e5fce2f61c4637921bd',
                    date: 1423135691152
                });
            });
        });

        describe('_compareRegistryFiles', function () {
            var model,
                remote;

            beforeEach(function () {
                var registryFilePath = path.join(process.cwd(), './test/fixtures/registry.json');
                remote = fsExtra.readJSONSync(registryFilePath);
            });

            it('should return valid result structure', function () {
                var local = JSON.parse(JSON.stringify(remote)),
                    result = task._compareRegistryFiles(target, local, remote);

                result.should.be.instanceOf(Object);

                result.should.have.property('added');
                result.should.have.property('modified');
                result.should.have.property('removed');

                result.added.should.be.instanceOf(Array);
                result.modified.should.be.instanceOf(Array);
                result.removed.should.be.instanceOf(Array);
            });

            it('nothing changed. registry files are equal', function () {
                var local = JSON.parse(JSON.stringify(remote)),
                    result = task._compareRegistryFiles(target, local, remote);

                result.modified.should.have.length(0);
                result.removed.should.have.length(0);
                result.added.should.have.length(0);

                target.getChanges().getLibraries().getAdded().should.have.length(0);
                target.getChanges().getLibraries().getModified().should.have.length(0);
                target.getChanges().getLibraries().getRemoved().should.have.length(0);
            });

            it('library was added', function () {
                var local = JSON.parse(JSON.stringify(remote));
                delete local['bem-bl'];

                var result = task._compareRegistryFiles(target, local, remote);

                result.modified.should.have.length(0);
                result.removed.should.have.length(0);
                result.added.should.have.length(1);
                should.deepEqual(result.added, [{ lib: 'bem-bl', version: 'dev' }]);

                target.getChanges().getLibraries().getAdded().should.have.length(1);
                should.deepEqual(target.getChanges().getLibraries().getAdded(), [{ lib: 'bem-bl', version: 'dev' }]);
            });

            it('library version was added', function () {
                var local = JSON.parse(JSON.stringify(remote));
                delete  local['bem-core' ].versions['v2'];

                var result = task._compareRegistryFiles(target, local, remote);

                result.modified.should.have.length(0);
                result.removed.should.have.length(0);
                result.added.should.have.length(1);
                should.deepEqual(result.added, [{ lib: 'bem-core', version: 'v2' }]);

                target.getChanges().getLibraries().getAdded().should.have.length(1);
                should.deepEqual(target.getChanges().getLibraries().getAdded(), [{ lib: 'bem-core', version: 'v2' }]);
            });

            it('library versions were added (several versions for one library)', function () {
                var local = JSON.parse(JSON.stringify(remote));
                delete  local['bem-core' ].versions['v2'];
                delete  local['bem-core' ].versions['v2.5.1'];
                delete  local['bem-core' ].versions['v2.6.0'];

                var result = task._compareRegistryFiles(target, local, remote);

                result.modified.should.have.length(0);
                result.removed.should.have.length(0);
                result.added.should.have.length(3);
                should.deepEqual(result.added, [
                    { lib: 'bem-core', version: 'v2' },
                    { lib: 'bem-core', version: 'v2.5.1' },
                    { lib: 'bem-core', version: 'v2.6.0' }
                ]);

                target.getChanges().getLibraries().getAdded().should.have.length(3);
                should.deepEqual(target.getChanges().getLibraries().getAdded(), [
                    { lib: 'bem-core', version: 'v2' },
                    { lib: 'bem-core', version: 'v2.5.1' },
                    { lib: 'bem-core', version: 'v2.6.0' }
                ]);
            });

            it('libraries versions were added (for different libraries)', function () {
                var local = JSON.parse(JSON.stringify(remote));
                delete  local['bem-core'].versions['v2'];
                delete  local['bem-components'].versions['v2'];

                var result = task._compareRegistryFiles(target, local, remote);

                result.modified.should.have.length(0);
                result.removed.should.have.length(0);
                result.added.should.have.length(2);
                should.deepEqual(result.added, [
                    { lib: 'bem-core', version: 'v2' },
                    { lib: 'bem-components', version: 'v2' }
                ]);

                target.getChanges().getLibraries().getAdded().should.have.length(2);
                should.deepEqual(target.getChanges().getLibraries().getAdded(), [
                    { lib: 'bem-core', version: 'v2' },
                    { lib: 'bem-components', version: 'v2' }
                ]);
            });

            it('library was removed', function () {
                var local = JSON.parse(JSON.stringify(remote));
                delete  remote['bem-bl'];

                var result = task._compareRegistryFiles(target, local, remote);

                result.modified.should.have.length(0);
                result.removed.should.have.length(1);
                result.added.should.have.length(0);
                should.deepEqual(result.removed, [{ lib: 'bem-bl', version: 'dev' }]);

                target.getChanges().getLibraries().getRemoved().should.have.length(1);
                should.deepEqual(target.getChanges().getLibraries().getRemoved(), [{ lib: 'bem-bl', version: 'dev' }]);
            });

            it('library version was removed', function () {
                var local = JSON.parse(JSON.stringify(remote));
                delete remote['bem-core' ].versions['v2'];

                var result = task._compareRegistryFiles(target, local, remote);

                result.modified.should.have.length(0);
                result.removed.should.have.length(1);
                result.added.should.have.length(0);
                should.deepEqual(result.removed, [{ lib: 'bem-core', version: 'v2' }]);

                target.getChanges().getLibraries().getRemoved().should.have.length(1);
                should.deepEqual(target.getChanges().getLibraries().getRemoved(), [{ lib: 'bem-core', version: 'v2' }]);
            });

            it('library versions were removed (several versions for one library)', function () {
                var local = JSON.parse(JSON.stringify(remote));
                delete remote['bem-core' ].versions['v2'];
                delete remote['bem-core' ].versions['v2.5.1'];
                delete remote['bem-core' ].versions['v2.6.0'];

                var result = task._compareRegistryFiles(target, local, remote);

                result.modified.should.have.length(0);
                result.removed.should.have.length(3);
                result.added.should.have.length(0);
                should.deepEqual(result.removed, [
                    { lib: 'bem-core', version: 'v2' },
                    { lib: 'bem-core', version: 'v2.5.1' },
                    { lib: 'bem-core', version: 'v2.6.0' }
                ]);

                target.getChanges().getLibraries().getRemoved().should.have.length(3);
                should.deepEqual(target.getChanges().getLibraries().getRemoved(), [
                    { lib: 'bem-core', version: 'v2' },
                    { lib: 'bem-core', version: 'v2.5.1' },
                    { lib: 'bem-core', version: 'v2.6.0' }
                ]);
            });

            it('libraries versions were removed (for different libraries)', function () {
                var local = JSON.parse(JSON.stringify(remote));
                delete remote['bem-core'].versions['v2'];
                delete remote['bem-components'].versions['v2'];

                var result = task._compareRegistryFiles(target, local, remote);

                result.modified.should.have.length(0);
                result.removed.should.have.length(2);
                result.added.should.have.length(0);
                should.deepEqual(result.removed, [
                    { lib: 'bem-core', version: 'v2' },
                    { lib: 'bem-components', version: 'v2' }
                ]);

                target.getChanges().getLibraries().getRemoved().should.have.length(2);
                should.deepEqual(target.getChanges().getLibraries().getRemoved(), [
                    { lib: 'bem-core', version: 'v2' },
                    { lib: 'bem-components', version: 'v2' }
                ]);
            });

            it('library version was modified (by sha sum)', function () {
                var local = JSON.parse(JSON.stringify(remote));
                remote['bem-core'].versions['v2'].sha = 'a25b147f254ee8e46c26031886f243221dc3d35e';

                var result = task._compareRegistryFiles(target, local, remote);

                result.modified.should.have.length(1);
                result.removed.should.have.length(0);
                result.added.should.have.length(0);
                should.deepEqual(result.modified, [{ lib: 'bem-core', version: 'v2' }]);

                target.getChanges().getLibraries().getModified().should.have.length(1);
                should.deepEqual(target.getChanges().getLibraries().getModified(), [{ lib: 'bem-core', version: 'v2' }]);
            });

            it('library version was modified (by date)', function () {
                var local = JSON.parse(JSON.stringify(remote));
                remote['bem-core'].versions['v2'].date = 1432047899247;

                var result = task._compareRegistryFiles(target, local, remote);

                result.modified.should.have.length(1);
                result.removed.should.have.length(0);
                result.added.should.have.length(0);
                should.deepEqual(result.modified, [{ lib: 'bem-core', version: 'v2' }]);

                target.getChanges().getLibraries().getModified().should.have.length(1);
                should.deepEqual(target.getChanges().getLibraries().getModified(), [{ lib: 'bem-core', version: 'v2' }]);
            });

            it('library versions were modified (several versions for one library)', function () {
                var local = JSON.parse(JSON.stringify(remote));
                remote['bem-core'].versions['v2'].sha = 'a25b147f254ee8e46c26031886f243221dc3d35e';
                remote['bem-core'].versions['v2.5.1'].date = 1423135728312;
                remote['bem-core'].versions['v2.6.0'].date = 1432044935917;

                var result = task._compareRegistryFiles(target, local, remote);

                result.modified.should.have.length(3);
                result.removed.should.have.length(0);
                result.added.should.have.length(0);
                should.deepEqual(result.modified, [
                    { lib: 'bem-core', version: 'v2' },
                    { lib: 'bem-core', version: 'v2.5.1' },
                    { lib: 'bem-core', version: 'v2.6.0' }
                ]);

                target.getChanges().getLibraries().getModified().should.have.length(3);
                should.deepEqual(target.getChanges().getLibraries().getModified(), [
                    { lib: 'bem-core', version: 'v2' },
                    { lib: 'bem-core', version: 'v2.5.1' },
                    { lib: 'bem-core', version: 'v2.6.0' }
                ]);
            });

            it('libraries versions were modified (for different libraries)', function () {
                var local = JSON.parse(JSON.stringify(remote));
                remote['bem-core'].versions['v2'].sha = 'a25b147f254ee8e46c26031886f243221dc3d35e';
                remote['bem-components'].versions['v2'].sha = '0fd242aa10d351405eda67ea3ae15074ad973bdc';

                var result = task._compareRegistryFiles(target, local, remote);

                result.modified.should.have.length(2);
                result.removed.should.have.length(0);
                result.added.should.have.length(0);
                should.deepEqual(result.modified, [
                    { lib: 'bem-core', version: 'v2' },
                    { lib: 'bem-components', version: 'v2' }
                ]);

                target.getChanges().getLibraries().getModified().should.have.length(2);
                should.deepEqual(target.getChanges().getLibraries().getModified(), [
                    { lib: 'bem-core', version: 'v2' },
                    { lib: 'bem-components', version: 'v2' }
                ]);
            });

            it('complex case (added, removed and modified)', function () {
                var local = JSON.parse(JSON.stringify(remote));
                delete local['bem-bl'];
                delete remote['bem-core'].versions['v2'];
                remote['bem-components'].versions['v2'].sha = '0fd242aa10d351405eda67ea3ae15074ad973bdc';

                var result = task._compareRegistryFiles(target, local, remote);

                result.modified.should.have.length(1);
                result.removed.should.have.length(1);
                result.added.should.have.length(1);

                should.deepEqual(result.added, [
                    { lib: 'bem-bl', version: 'dev' }
                ]);
                should.deepEqual(result.modified, [
                    { lib: 'bem-components', version: 'v2' }
                ]);
                should.deepEqual(result.removed, [
                    { lib: 'bem-core', version: 'v2' }
                ]);

                target.getChanges().getLibraries().getAdded().should.have.length(1);
                target.getChanges().getLibraries().getModified().should.have.length(1);
                target.getChanges().getLibraries().getRemoved().should.have.length(1);

                should.deepEqual(target.getChanges().getLibraries().getAdded(), [
                    { lib: 'bem-bl', version: 'dev' }
                ]);
                should.deepEqual(target.getChanges().getLibraries().getModified(), [
                    { lib: 'bem-components', version: 'v2' }
                ]);
                should.deepEqual(target.getChanges().getLibraries().getRemoved(), [
                    { lib: 'bem-core', version: 'v2' }
                ]);
            });
        });

        describe('_saveLibraryVersionFile', function () {
            before(function (done) {
                emulator.start(3000, 3001);
                setTimeout(done, 300);
            });

            it('should rejected with error if library version data file does not exists in MDS', function () {
                return task._saveLibraryVersionFile({ lib: 'bem-core', version: 'v2' }, target)
                    .fail(function (error) {
                        error.message.should.equal('Bla');
                    });
            });

            it('should successfully download library version file from MDS to filesystem', function () {
                var testData = JSON.stringify({ lib: 'bem-core', version: 'v2' });
                return testAPI.writeP('bem-core/v2/data.json', testData)
                    .then(function () {
                        return task._saveLibraryVersionFile({ lib: 'bem-core', version: 'v2' }, target);
                    })
                    .then(function () {
                        var result = fsExtra.readJSONSync(
                            path.join(task._getLibVersionPath(target, 'bem-core', 'v2'), 'data.json'));
                        should.deepEqual(result, JSON.parse(testData));
                    });
            });

            after(function (done) {
                emulator.stop();
                setTimeout(done, 300);
            });
        });

        describe('_removeLibraryVersionFolder', function () {
            before(function () {
                var p = task._getLibVersionPath(target, 'bem-core', 'v2');
                fsExtra.ensureDirSync(p);
                fsExtra.outputFileSync(path.join(p, 'data.json'), 'Foo Bar', 'utf-8');
            });

            it('should successfully remove library version folder in local cache', function () {
                return task._removeLibraryVersionFolder({ lib: 'bem-core', version: 'v2' }, target).then(function () {
                    fs.existsSync(task._getLibVersionPath(target, 'bem-core', 'v2')).should.equal(false);
                });
            });
        });

        describe('run', function () {
            before(function (done) {
                emulator.start(3000, 3001);
                setTimeout(done, 300);
            });

            it('should successfully load all library versions on first launch', function () {
                var registryFilePath = path.join(process.cwd(), './test/fixtures/registry.json'),
                    registry = fsExtra.readJSONSync(registryFilePath),
                    libVersions = [],
                    promises;

                Object.keys(registry).forEach(function (lib) {
                    Object.keys(registry[lib ].versions).forEach(function (version) {
                        libVersions.push({ lib: lib, version: version });
                    });
                });

                promises = []
                    .concat(testAPI.writeP('root', JSON.stringify(registry)))
                    .concat(libVersions.map(function (item) {
                        return testAPI.writeP(item.lib + '/' + item.version + '/data.json', JSON.stringify(item));
                    }));

                return vow.all(promises)
                    .then(function () {
                        return task.run(target);
                    })
                    .then(function (target) {
                        var changes = target.getChanges().getLibraries();
                        changes.getAdded().should.have.length(15);
                        changes.getModified().should.have.length(0);
                        changes.getRemoved().should.have.length(0);
                    });
            });

            // TODO add more tests for run method for different cases

            after(function (done) {
                emulator.stop();
                setTimeout(done, 300);
            });
        });
    });
});

