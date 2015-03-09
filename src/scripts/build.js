'use strict';

var Base = require('../scripts/base'),
    inherit = require('inherit'),
    MailSender = require('../api/mail-sender');

module.exports = inherit(Base, {
    __constructor: function (options) {
        this.__base(options);
        this._mailSender = new MailSender(options['mailer']);

        // TODO initialize other providers here
    },

    /**
     * Returns mail sender
     * @returns {MailSender|*}
     */
    get mailSender() {
        return this._mailSender;
    },

    /**
     * Returns name of scripts
     * @returns {String}
     */
    get name() {
        return 'BUILD';
    }
});
