var util = require('util'),

    _ = require('lodash'),
    vow = require('vow'),
    nm = require('nodemailer'),
    transport = require('nodemailer-smtp-transport'),

    errors = require('../errors').Mailer,
    logger = require('./../logger'),
    mailer;

module.exports = {
    /**
     * Initialize mailer module
     */
    init: function (options) {
        logger.info('Initialize e-mail sending module', module);

        if (!options) {
            errors.createError(errors.CODES.MAILER_NOT_CONFIGURED).log('warn');
            return vow.resolve();
        }

        mailer = new nm.createTransport(transport({
            host: options.host,
            port: options.port
        }));
        return vow.resolve(mailer);
    },

    /**
     * Email sending
     * @param {Object} options - e-mail options object
     * @returns {*}
     */
    send: function (options) {
        var base = { encoding: 'utf-8' };

        logger.info(util.format('send email //subject: %s  //body: %s', options.subject, options.text), module);

        if (!mailer) {
            errors.createError(errors.CODES.NOT_INITIALIZED).log();
            return vow.resolve();
        }

        var def = vow.defer();
        mailer.sendMail(_.extend({}, base, options), function (err) {
            errors.createError(errors.CODES.COMMON, { err: err }).log();
            err ? def.reject(err) : def.resolve();
        });

        return def.promise();
    }
};
