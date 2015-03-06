'use strict';

var _ = require('lodash'),
    nodeMailer = require('nodemailer'),
    transport = require('nodemailer-smtp-transport'),

    Logger = require('../logger'),

    /**
     * Constructor for MailSender class
     * @param {String} host of smtp e-mail server
     * @param {Number} port of smtp e-mail server
     * @constructor
     */
    MailSender = function (host, port) {
        this._init(host, port);
    };

MailSender.prototype = {
    _BASE: {
        ENCODING: 'utf-8'
    },

    _host: undefined,
    _port: undefined,
    _logger: undefined,
    _sender: undefined,

    _init: function (host, port) {
        this._logger = new Logger(module, 'debug');
        this._host = host;
        this._port = port;

        var errorMessage;
        if (!this._host) {
            errorMessage = 'SMTP server host was not set';
        } else if (!this._port) {
            errorMessage = 'SMTP server port was not set';
        } else if (!_.isNumber(this._port)) {
            errorMessage = 'SMTP server port has invalid format. It should be number';
        }

        if (errorMessage) {
            this._logger.error(errorMessage);
            throw new Error(errorMessage);
        }

        this._sender = new nodeMailer.createTransport(transport({
            host: this._host,
            port: this._port
        }));
        return this;
    },

    /**
     * Validates e-mail sender
     * @param {String} sender of e-mail
     * @returns {Null|String}
     * @private
     */
    _validateSender: function (sender) {
        if (!sender) {
            return 'E-Mail sender was not set or empty';
        } else if (!_.isString(sender)) {
            return 'E-Mail sender type error. Should be string';
        } else {
            return null;
        }
    },

    /**
     * Validates e-mail recipients
     * @param {Array} recipients of e-mail
     * @returns {Null|String}
     * @private
     */
    _validateRecipients: function (recipients) {
        if (!recipients) {
            return 'E-Mail recipients were not set';
        } else if (!_.isArray(recipients)) {
            return 'E-Mail recipients type error. Should be array';
        } else {
            return null;
        }
    },

    /**
     * Validates e-mail subject
     * @param {String} subject of e-mail
     * @returns {Null|String}
     * @private
     */
    _validateSubject: function (subject) {
        if (!subject) {
            return 'E-Mail subject was not set or empty';
        } else if (!_.isString(subject)) {
            return 'E-Mail subject type error. Should be string';
        } else {
            return null;
        }
    },

    _validateHtmlBody: function (htmlBody) {
        if (!htmlBody) {
            return 'Html code of body was not set or empty';
        } else if (!_.isString(htmlBody)) {
            return 'Html message type error. Should be string';
        } else {
            return null;
        }
    },

    /**
     * Sends e-mail by given options
     * @param {Object} options options for sending mail
     * @param {Function} callback function
     * @private
     */
    _send: function (options, callback) {
        this._sender.sendMail(_.extend({}, this._BASE, options), callback);
    },

    /**
     * Sends e-mail with html content
     * @param {String} from - e-mail of sender
     * @param {Array} to - array of target e-mails
     * @param {String} subject of e-mail
     * @param {String} html string in e-mail body
     */
    sendHtml: function (from, to, subject, html, callback) {
        var options,
            errorMessage =
                this._validateSender(from) ||
                this._validateRecipients(to) ||
                this._validateSubject(subject) ||
                this._validateHtmlBody(html);

        if (errorMessage) {
            this._logger.error(errorMessage);
            return callback && callback(new Error(errorMessage));
        }

        this._logger.info('Sending e-mail:');
        this._logger.debug('From: %s', from);
        this._logger.debug('To: %s', to);
        this._logger.debug('Subject: %s', subject);

        options = {
            from: from,
            to: to,
            subject: subject,
            html: html
        };

        return this._send(options, callback);
    }
};

module.exports = MailSender;
