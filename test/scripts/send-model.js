var http = require('http'),
    should = require('should'),
    SendModel = require('../../src/scripts/send-model'),
    server;

describe('scripts/send-model', function () {
    before(function () {
        server = http.createServer(function (req, res) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end();
        });
        server.listen(3000, '127.0.0.1');
    });

    it ('should not be initialized without given options', function () {
        (function () { new SendModel(); }).should.throw('No options were given');
    });

    it ('should not be initialized without host parameter', function () {
        (function () { new SendModel({}); }).should.throw('Provider host undefined');
    });

    it ('should not be initialized without port parameter', function () {
        (function () { new SendModel({ host: '127.0.0.1' }); }).should.throw('Provider port undefined');
    });

    it ('should be successfully initialized with given params', function () {
        new SendModel({ host: '127.0.0.1', port: 3000 });
    });

    it ('should have valid link after initialization', function () {
        var sm = new SendModel({ host: '127.0.0.1', port: 3000 });
        sm.should.have.property('_link');
        sm._link.should.be.ok;
        sm._link.should.equal('http://127.0.0.1:3000/model');
    });

    it ('should successfully send model file', function () {
        var sm = new SendModel({ host: '127.0.0.1', port: 3000 });
        sm.execute(function (err) {
            should(err).be.null;
        });
    });

    it ('should send model file with error', function () {
        var sm = new SendModel({ host: '127.0.0.1', port: 3001 });
        sm.execute(function (err) {
            err.should.be.ok
            err.should.be.instanceof(Error);
        });
    });

    after(function () {
        server.close();
    });
});
