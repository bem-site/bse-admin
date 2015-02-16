var path = require('path'),
    utility = require('../../src/util.js'),
    levelDb = require('../../src/providers/level-db'),

    TEST_DB_PATH = path.join(process.cwd(), 'test', 'testDb'),

    testKey1 = 'test_key_1',
    testData1 = { name: 'test_data_1' };

describe('level database provider', function () {
    it('should can be initialized successfully', function (done) {
        levelDb.init(TEST_DB_PATH).then(function () {
            done();
        });
    });

    it('should be in initialized state after initialization', function () {
        levelDb.get().isInitialized().should.be.ok;
    });

    it('should return undefined for get non-existed data', function (done) {
        levelDb.get().get('non_existed_key').then(function (data) {
            (data === undefined).should.be.ok;
            done();
        });
    });

    it('should successfully put data by key', function (done) {
        levelDb.get().put(testKey1, testData1).then(function () {
            levelDb.get().get(testKey1).then(function (data) {
                data.should.be.ok;
                data.should.be.instanceOf(Object);
                data.should.have.property('name');
                data.name.should.equal(testData1.name);
                done();
            });
        });
    });

    it('should successfully remove data by key', function (done) {
        levelDb.get().del(testKey1).then(function () {
            levelDb.get().get(testKey1).then(function (data) {
                (data === undefined).should.be.ok;
                done();
            });
        });
    });

    after(function (done) {
        return levelDb.get().disconnect().then(function () {
            return utility.removeDir(TEST_DB_PATH);
        }).then(function () {
            done();
        });
    });
});
