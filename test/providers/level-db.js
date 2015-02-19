var path = require('path'),

    vow = require('vow'),
    vowFs = require('vow-fs'),

    utility = require('../../src/util.js'),
    levelDb = require('../../src/providers/level-db'),

    TEST_DB_PATH = path.join(process.cwd(), 'test', 'testDb'),
    TEST_SNAPSHOT_PATH = path.join(process.cwd(), 'test', 'testDb1'),

    testKey1 = 'test_key_1',
    testData1 = { name: 'test_data_1' },
    batchOperations = [
        { type: 'put', key: 'batchKey1', value: { name: 'batchValue1' } },
        { type: 'put', key: 'batchKey2', value: { name: 'batchValue2' } },
        { type: 'put', key: 'batchKey3', value: { name: 'batchValue3' } },
        { type: 'put', key: 'batchKey4', value: { name: 'batchValue4' } },
        { type: 'put', key: 'batchKey5', value: { name: 'batchValue5' } }
    ];

describe('level database provider', function () {
    it('should can be initialized successfully', function (done) {
        return levelDb.init(TEST_DB_PATH).then(function () {
            done();
        });
    });

    it('should be in initialized state after initialization', function () {
        return levelDb.get().isInitialized().should.be.ok;
    });

    it('should return undefined for get non-existed data', function (done) {
        return levelDb.get().get('non_existed_key').then(function (data) {
            (data === undefined).should.be.ok;
            done();
        });
    });

    it('should put data by key', function (done) {
        return levelDb.get().put(testKey1, testData1).then(function () {
            return levelDb.get().get(testKey1).then(function (data) {
                data.should.be.ok;
                data.should.be.instanceOf(Object);
                data.should.have.property('name');
                data.name.should.equal(testData1.name);
                done();
            });
        });
    });

    it('should remove data by key', function (done) {
        return levelDb.get().del(testKey1).then(function () {
            return levelDb.get().get(testKey1).then(function (data) {
                (data === undefined).should.be.ok;
                done();
            });
        });
    });

    it('should put bulk data by batch method', function (done) {
        return levelDb.get().batch(batchOperations).then(function () {
            done();
        });
    });

    it('should retrieve keys by criteria', function (done) {
        return levelDb.get().getKeysByCriteria(function (key) {
            return key.indexOf('batch') > -1;
        }, {}).then(function (data) {
            data.should.be.ok;
            data.should.be.instanceOf(Array).and.have.length(5);
            done();
        });
    });

    it('should retrieve values by criteria', function (done) {
        return levelDb.get().getValuesByCriteria(function (value) {
            return value.name.indexOf('batch') > -1;
        }, {}).then(function (data) {
            data.should.be.ok;
            data.should.be.instanceOf(Array).and.have.length(5);
            done();
        });
    });

    it('should retrieve records by criteria', function (done) {
        return levelDb.get().getByCriteria(function (record) {
            return record.key.indexOf('batch') > -1 || record.value.name.indexOf('batch') > -1;
        }, {}).then(function (data) {
            data.should.be.ok;
            data.should.be.instanceOf(Array).and.have.length(5);
            done();
        });
    });

    it('should remove records by criteria', function (done) {
        return levelDb.get().removeByCriteria(function (record) {
            return record.key.indexOf('batchKey1') > -1;
        }, {}).then(function () {
            return levelDb.get().getByCriteria(function (record) {
                return record.key.indexOf('batch') > -1 || record.value.name.indexOf('batch') > -1;
            }, {}).then(function (data) {
                data.should.be.ok;
                data.should.be.instanceOf(Array).and.have.length(4);
                done();
            });
        });
    });

    it('should get by key range', function (done) {
        return levelDb.get().getByKeyRange('batch', 'catch').then(function (data) {
            data.should.be.ok;
            data.should.be.instanceOf(Array).and.have.length(4);
            done();
        });
    });

    it('should remove by key range', function (done) {
        return levelDb.get().removeByKeyPrefix('batch').then(function () {
            return levelDb.get().getByCriteria(function (record) {
                return record.key.indexOf('batch') > -1;
            }, {}).then(function (data) {
                data.should.be.ok;
                data.should.be.instanceOf(Array).and.have.length(0);
                done();
            });
        });
    });

    it('should copy', function (done) {
        return levelDb.get().copy(TEST_SNAPSHOT_PATH).then(function () {
            return vowFs.exists(TEST_SNAPSHOT_PATH).then(function (exists) {
                exists.should.be.ok;
                return vow.all([
                    vowFs.listDir(path.join(TEST_DB_PATH, 'leveldb')),
                    vowFs.listDir(path.join(TEST_SNAPSHOT_PATH, 'leveldb'))
                ]).spread(function (files1, files2) {
                    files1.should.be.instanceOf(Array);
                    files2.should.be.instanceOf(Array);
                    files1.length.should.be.above(0);
                    files2.length.should.be.above(0);
                    files1.length.should.equal(files2.length);
                    done();
                });
            });
        });
    });

    it('should disconnect', function (done) {
        return levelDb.get().disconnect().then(function () {
            levelDb.get().isInitialized().should.not.be.ok;
            done();
        });
    });

    after(function (done) {
        return vow.all([
            utility.removeDir(TEST_DB_PATH),
            utility.removeDir(TEST_SNAPSHOT_PATH)
        ])
        .then(function () {
            done();
        });
    });
});
