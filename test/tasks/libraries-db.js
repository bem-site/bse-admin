var fs = require('fs'),
    path = require('path'),
    vow = require('vow'),
    should = require('should'),
    fsExtra = require('fs-extra'),
    levelDb = require('../../src/providers/level-db'),
    Target = require('../../src/targets/nodes'),
    task = require('../../src/tasks/libraries-db');

describe('libraries-db', function () {
    describe('methods', function () {
        var target, cacheFolder, dbFolder;

        before(function () {
            dbFolder = path.join(process.cwd(), './db');
            fsExtra.mkdirpSync(dbFolder);
            levelDb.init(dbFolder);
        });

        beforeEach(function () {
            target = new Target({});
            cacheFolder = path.join(process.cwd(), './cache');
            fsExtra.mkdirsSync(cacheFolder);
        });

        afterEach(function () {
            fsExtra.removeSync(cacheFolder);
        });

        after(function () {
            fsExtra.removeSync(dbFolder);
        });

        describe('_getDbHints', function () {
            it('should return valid db hints object', function () {
                should.deepEqual(task._getDbHints(target), { fillCache: true, gte: 'nodes:', lt: 'people:' });
            });
        });

        describe('_getRootLibNodes', function () {
            it('should return empty list of root library nodes', function () {
                return task._getRootLibNodes(target).then(function (result) {
                    result.should.be.instanceOf(Array).and.have.length(0);
                })
            });

            it('should return valid list of root library nodes', function () {
                return levelDb.get().batch([
                        { type: 'put', key: 'nodes:1', value: { id: 'nodes:1', lib: 'bem-core' } },
                        { type: 'put', key: 'nodes:2', value: { id: 'nodes:2', name: 'non-library1' } },
                        { type: 'put', key: 'nodes:3', value: { id: 'nodes:3', lib: 'bem-components' } },
                        { type: 'put', key: 'nodes:4', value: { id: 'nodes:4', name: 'non-library2 '} },
                        { type: 'put', key: 'nodes:5', value: { id: 'nodes:5', lib: 'bem-bl' } }
                    ])
                    .then(function () {
                        return task._getRootLibNodes(target);
                    })
                    .then(function (result) {
                        should.deepEqual(result, [
                            { key: 'nodes:1', value: { id: 'nodes:1', lib: 'bem-core' } },
                            { key: 'nodes:3', value: { id: 'nodes:3', lib: 'bem-components' } },
                            { key: 'nodes:5', value: { id: 'nodes:5', lib: 'bem-bl' } }
                        ]);
                    });
            });

            after(function () {
                return levelDb.get().batch([
                    { type: 'del', key: 'nodes:1' },
                    { type: 'del', key: 'nodes:2' },
                    { type: 'del', key: 'nodes:3' },
                    { type: 'del', key: 'nodes:4' },
                    { type: 'del', key: 'nodes:5' }
                ]);
            })
        });

        describe('_getLibVersionNodes', function () {
            it('should return empty list of lib version nodes', function () {
                return task._getLibVersionNodes(target, 'bem-core').then(function (result) {
                    result.should.be.instanceOf(Array).and.have.length(0);
                })
            });

            it('should return valid list of lib version nodes', function () {
                return levelDb.get().batch([
                        { type: 'put', key: 'nodes:11', value: { parent: 'nodes:1' } },
                        { type: 'put', key: 'nodes:12', value: { parent: 'nodes:1' } },
                        { type: 'put', key: 'nodes:13', value: { parent: 'nodes:2' } },
                        { type: 'put', key: 'nodes:14', value: { parent: 'nodes:3' } }
                    ])
                    .then(function () {
                        return task._getLibVersionNodes(target, { id: 'nodes:1' });
                    })
                    .then(function (result) {
                        should.deepEqual(result, [
                            {key: 'nodes:11', value: {parent: 'nodes:1'}},
                            {key: 'nodes:12', value: {parent: 'nodes:1'}}
                        ]);
                    });
            });

            after(function () {
                return levelDb.get().batch([
                    { type: 'del', key: 'nodes:11' },
                    { type: 'del', key: 'nodes:12' },
                    { type: 'del', key: 'nodes:13' },
                    { type: 'del', key: 'nodes:14' }
                ]);
            });
        });

        describe('_removeLibVersionsFromDb', function () {
            before(function () {
                var records = [11, 12, 13, 14, 15].map(function (item) {
                    var key = 'nodes:' + item,
                        value = {
                            route: {
                                conditions: {
                                    lib: 'bem-core',
                                    version: 'v0.0.' + item%2
                                }
                            }
                        };
                    return { key: key, value: value };
                });

                records = records
                    .concat({ key: 'nodes:7', value: {} })
                    .concat({ key: 'nodes:8', value: { route: {} } })
                    .concat({ key: 'nodes:9', value: { route: { conditions: {} } } })
                    .concat({ key: 'nodes:10', value: { lib: 'bem-core' } });

                return levelDb.get().batch(records.map(function (record) {
                    record.type = 'put';
                    return record;
                }));
            });

            it('should remove given library versions from database', function () {
                return levelDb.get().getByCriteria(function () { return true; }, {})
                    .then(function (result) {
                        return result.should.have.length(9);
                    })
                    .then(function () {
                        return task._removeLibVersionsFromDb(target, [
                            { lib: 'bem-core', version: 'v0.0.0' },
                            { lib: 'bem-core', version: 'v0.0.1' }
                        ]);
                    })
                    .then(function () {
                        return levelDb.get().getByCriteria(function () { return true; }, {});
                    })
                    .then(function (result) {
                        result.should.have.length(4);
                    });
            });

            after(function () {
                return levelDb.get().batch([
                    { type: 'del', key: 'nodes:7' },
                    { type: 'del', key: 'nodes:8' },
                    { type: 'del', key: 'nodes:9' },
                    { type: 'del', key: 'nodes:10' }
                ]);
            });
        });

        describe('_loadVersionFile', function () {
            beforeEach(function () {
                fsExtra.ensureDirSync(path.join(cacheFolder, './libraries'));
            });

            it('should return rejected promise if version file does not exists for given library version', function () {
                return task._loadVersionFile(target, 'bem-core', 'v2').fail(function (error) {
                    error.message.indexOf('ENOENT').should.be.above(-1);
                    error.message.indexOf('cache/libraries/bem-core/v2/data.json').should.be.above(-1);
                });
            });

            it('should successfully open version file for given library version', function () {
                var p1 = path.join(cacheFolder, './libraries/bem-core/v2'),
                    p2 = path.join(process.cwd(), './test/fixtures/data.json');
                fsExtra.ensureDirSync(p1);
                fsExtra.copySync(p2, path.join(p1, 'data.json'));

                return task._loadVersionFile(target, 'bem-core', 'v2').then(function (content) {
                    content.should.be.instanceOf(Object);
                    content.repo.should.equal('bem-core');
                    content.ref.should.equal('v2');
                });
            });
        });

        describe('_compareVersions', function () {
            it('should sort semver tags in correct order #1', function () {
                task._compareVersions('0.0.2', '0.0.1').should.equal(-1);
            });

            it('should sort semver tags in correct order #2', function () {
                task._compareVersions('0.0.1', '0.0.2').should.equal(1);
            });

            it('should sort semver tags in correct order #3', function () {
                task._compareVersions('v0.0.1', '0.0.2').should.equal(1);
            });

            it('should sort semver tags in correct order #4', function () {
                task._compareVersions('0.0.1', 'v0.0.2').should.equal(1);
            });

            it('should sort semver tags in correct order #5', function () {
                task._compareVersions('v0.0.1', 'v0.0.2').should.equal(1);
            });

            it('should sort between semver tag and dev branch', function () {
                task._compareVersions('v0.0.1', 'dev').should.equal(-1);
            });

            it('should sort between semver tag and master branch', function () {
                task._compareVersions('v0.0.1', 'master').should.equal(-1);
            });

            it('should sort between semver tag and custom branch', function () {
                task._compareVersions('v0.0.1', 'foo-bar').should.equal(-1);
            });

            it('should sort between dev branch and custom branch', function () {
                task._compareVersions('dev', 'foo-bar').should.equal(1);
            });

            it('should sort between master branch and custom branch', function () {
                task._compareVersions('master', 'foo-bar').should.equal(1);
            });

            it('should sort between custom branches', function () {
                task._compareVersions('foo-bar', 'foo-bar1').should.equal(1);
            });
        });

        describe('_addAllFromRegistry', function () {

        });
    });
});
