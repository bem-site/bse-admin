var logger = require('../logger'),
    People = require('./People'),

    people;

module.exports = {
    init: function() {
        logger.info('Initialize application model', module);
        people = new People();
    },

    /**
     * Returns people model
     * @returns {People}
     */
    getPeople: function () {
        return people;
    }
};
