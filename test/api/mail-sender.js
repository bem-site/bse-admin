var should = require('should'),
    MailSender = require('../../src/api/mail-sender'),

    host = 'outbound-relay.yandex.net',
    port = 25;

describe('api/mail-sender', function () {
    describe('should not be initialized', function () {
        it('without host parameter', function () {
            (function () { new MailSender(); }).should.throw('SMTP server host was not set');
        });

        it('with empty host parameter', function () {
            (function () { new MailSender(''); }).should.throw('SMTP server host was not set');
        });

        it('without empty port parameter', function () {
            (function () { new MailSender('smtp.test.host'); }).should.throw('SMTP server port was not set');
        });

        it('without invalid port parameter', function () {
            (function () { new MailSender('smtp.test.host', 'string port'); })
                .should.throw('SMTP server port has invalid format. It should be number');
        });
    });

    it('should be initialized with valid parameters', function () {
        var ms = new MailSender(host, port);

        ms.should.be.ok;
        ms._logger.should.be.ok;
        ms._sender.should.be.ok;
    });

    describe('sendHtml', function () {
        var ms;

        before(function () {
            ms = new MailSender(host, port);
        });

        describe('should fail', function () {
            it ('sending html without "from" argument', function (done) {
                ms.sendHtml(null, null, null, null, function (error) {
                    error.should.be.ok;
                    error.message.should.equal('E-Mail sender was not set or empty');
                    done();
                });
            });

            it ('sending html with invalid type of "from" argument', function (done) {
                ms.sendHtml(10, null, null, null, function (error) {
                    error.should.be.ok;
                    error.message.should.equal('E-Mail sender type error. Should be string');
                    done();
                });
            });

            it ('sending html without "to" argument', function (done) {
                ms.sendHtml('from@bse-admin.yandex.net', null, null, null, function (error) {
                    error.should.be.ok;
                    error.message.should.equal('E-Mail recipients were not set');
                    done();
                });
            });

            it ('sending html with invalid type of "to" argument', function (done) {
                ms.sendHtml('from@bse-admin.yandex.net', 10, null, null, function (error) {
                    error.should.be.ok;
                    error.message.should.equal('E-Mail recipients type error. Should be array');
                    done();
                });
            });

            it ('sending html without "subject" argument', function (done) {
                ms.sendHtml('from@bse-admin.yandex.net', ['to@bse-admin.yandex.net'], null, null, function (error) {
                    error.should.be.ok;
                    error.message.should.equal('E-Mail subject was not set or empty');
                    done();
                });
            });

            it ('sending html with invalid type of "subject" argument', function (done) {
                ms.sendHtml('from@bse-admin.yandex.net', ['to@bse-admin.yandex.net'], 10, null, function (error) {
                    error.should.be.ok;
                    error.message.should.equal('E-Mail subject type error. Should be string');
                    done();
                });
            });

            it ('sending html without "html" argument', function (done) {
                ms.sendHtml('from@bse-admin.yandex.net', ['to@bse-admin.yandex.net'],
                    'subject', null, function (error) {
                        error.should.be.ok;
                        error.message.should.equal('Html code of body was not set or empty');
                        done();
                    });
            });

            it ('sending html with invalid type of "html" argument', function (done) {
                ms.sendHtml('from@bse-admin.yandex.net', ['to@bse-admin.yandex.net'], 'subject', 10, function (error) {
                    error.should.be.ok;
                    error.message.should.equal('Html message type error. Should be string');
                    done();
                });
            });
        });

        it('should send', function (done) {
            ms.sendHtml('from@bse-admin.yandex.net', ['to@bse-admin.yandex.net'], 'subject', 'body', function (error) {
                should(error).not.be.ok;
                done();
            });
        })
    });
});
