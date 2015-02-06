var util = require('util'),

    vow = require('vow'),
    trtd = require('trtd'),

    mailer = require('../providers/mailer'),
    config = require('../config'),
    logger = require('../logger'),

    CHANGES_FIELDS = ['_added', '_modified', '_removed'];

/**
 * Group libraries changes bu library name
 * @param {Array} arr - array of changes
 * @returns {Array}
 * @private
 */
function _groupLibraryChanges(arr) {
    var o = arr.reduce(function (prev, item) {
        prev[item['lib']] = prev[item['lib']] || [];
        prev[item['lib']].push(item.version);
        return prev;
    }, {});

    if (Object.keys(o).length === 0) {
        return null;
    }

    return Object.keys(o).map(function (key) {
        return { lib: key, versions: o[key].join(', ') };
    });
}

/**
 * Join html tables of changes into single html structure
 * @param {String} added - added changes html table
 * @param {String} modified - modified changes html table
 * @param {String} removed - removed changes html table
 * @param {String} title - common title
 * @returns {string}
 * @private
 */
function _joinChanges(added, modified, removed, title) {
    var result = '<h1>' + title + '</h1>';

    if (!added && !modified && !removed) {
        return result + '<br/>Nothing has been changed';
    }

    // check if any docs were added
    if (added) {
        result += '<br/><h2>Added</h2><br/>' + added;
    }

    // check if any docs were modified
    if (modified) {
        result += '<br/><h2>Modified</h2><br/>' + modified;
    }

    // check if any docs were removed
    if (removed) {
        result += '<br/><h2>Removed</h2><br/>' + removed;
    }

    return result;
}

/**
 * Create html presentation of documentation changes
 * @param {TargetBase} target object
 * @returns {String}
 * @private
 */
function _createDocsChangesTable(target) {
    var docs = target.getChanges()._docs;

    return vow.all(CHANGES_FIELDS
            .map(function (key) {
                if (docs[key].length === 0) {
                    return null;
                }

                docs[key] = docs[key].map(function (item) {
                    item.title = item.title || '';
                    return item;
                });

                return docs[key];
            })
            .map(function (item) {
                return item ? trtd(['title', 'url'], item) : null;
            })
        )
        .spread(function (added, modified, removed) {
            return _joinChanges(added, modified, removed, 'Docs');
        });
}

/**
 * Create html presentation of libraries changes
 * @param {TargetBase} target object
 * @returns {String}
 * @private
 */
function _createLibrariesChangesTable(target) {
    var libraries = target.getChanges()._libraries;

    return vow.all(CHANGES_FIELDS
            .map(function (key) {
                return _groupLibraryChanges(libraries[key]);
            })
            .map(function (item) {
                return item ? trtd(['lib', 'versions'], item) : null;
            })
        )
        .spread(function (added, modified, removed) {
            return _joinChanges(added, modified, removed, 'Libraries');
        });
}

module.exports = function (target) {
    logger.info('Send  e-mail start', module);

    if (!target.getChanges().areModified()) {
        logger.warn('No changes were made during this synchronization. This step will be skipped', module);
        return vow.resolve(target);
    }

    var subject = util.format('bem-site-provider: create new data version %s', target.getSnapshotName());

    return vow
        .all([
            _createDocsChangesTable(target),
            _createLibrariesChangesTable(target)
       ])
        .spread(function (docs, libraries) {
            return mailer.send({
                from: config.get('mailer:from'),
                to: config.get('mailer:to'),
                subject: subject,
                html: docs + libraries
            });
        })
        .then(function () {
            return vow.resolve(target);
        });
};
