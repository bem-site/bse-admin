var _ = require('lodash'),
    util = require('util'),
    utility = require('../util');

var Meta = function(meta, lang, collected) {
    Object.keys(meta).forEach(function(key) { this[key] = meta[key]; }, this);

    this
        .convertDate('createDate')
        .convertDate('editDate')
        .collectPeople('authors', collected)
        .collectPeople('translators', collected)
        .collectTags(lang, collected)
        .setRepo();
};

Meta.prototype = {

    /**
     * Converts date fields of post meta information to milliseconds
     * @param field - {String} name of field
     * @returns {Meta}
     */
    convertDate: function(field) {
        this[field] && (this[field] = utility.dateToMilliseconds(this[field]));
        return this;
    },

    /**
     * Collects people data of post
     * @param field - {String} name of field
     * @param collected - {Object} hash of collected data
     * @returns {Meta}
     */
    collectPeople: function(field, collected) {
        this[field] && (collected[field] = collected[field].concat(this[field]));
        return this;
    },

    /**
     * Collects tags data for post
     * @param lang - {String} language
     * @param collected - {Object} hash of collected data
     * @returns {Meta}
     */
    collectTags: function(lang, collected) {
        if(this.tags) {
            collected.tags[lang] = collected.tags[lang] || [];
            collected.tags[lang] = collected.tags[lang].concat(this.tags);
        }
        return this;
    },

    /**
     * Sets repository information and urls
     * for issues and prose.io edit
     * @returns {Meta}
     */
    setRepo: function() {
        if(!this.content && this.stub) {
            this.repo = null;
            return this;
        }

        var regExp = /^https?:\/\/(.+?)\/(.+?)\/(.+?)\/(tree|blob)\/(.+?)\/(.+)/,
            parsedRepo = this.content.match(regExp);

        if(!parsedRepo) {
            this.repo = null;
            return this;
        }

        this.repo = {
            host: parsedRepo[1],
            user: parsedRepo[2],
            repo: parsedRepo[3],
            ref:  parsedRepo[5],
            path: parsedRepo[6]
        };

        //generate advanced params for repository
        this.repo = _.extend(this.repo, {
            type: this.getTypeOfRepository(),
            issue: this.generateIssueUrl(this.title),
            prose: this.generateProseUrl()
        });

        return this;
    },

    /**
     * Returns type of repository
     */
    getTypeOfRepository: function() {
        return this.repo.host.indexOf('github.com') > -1 ? 'public' : 'private';
    },

    /**
     * Returns generated url for issues of repo which post belongs to
     * @param title - {String} title of post
     * @returns {String}
     */
    generateIssueUrl: function(title) {
        var r = this.repo;
        return util.format('https://%s/%s/%s/issues/new?title=Feedback+for+\"%s\"', r.host, r.user, r.repo, title);
    },

    /**
     * Returns generated url for editing post by prose.io service
     * @returns {String}
     */
    generateProseUrl: function() {
        var r = this.repo;
        return util.format('http://prose.io/#%s/%s/edit/%s/%s', r.user, r.repo, r.ref, r.path);
    },

    isDifferentFromDb: function(dbRecord) {
        dbRecord = dbRecord.value;

        return !dbRecord ||
        !_.isEqual(this.title, dbRecord.title) ||
        !_.isEqual(this.createDate, dbRecord.createDate) ||
        !_.isEqual(this.authors, dbRecord.authors) ||
        !_.isEqual(this.translators, dbRecord.translators) ||
        !_.isEqual(this.tags, dbRecord.tags) ||
        !_.isEqual(this.content, dbRecord.url);
    }
};

module.exports = Meta;
