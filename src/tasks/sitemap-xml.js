var util = require('util'),

    _ = require('lodash'),
    vow = require('vow'),
    js2xml = require('js2xmlparser'),

    config = require('../config'),
    logger = require('../logger'),
    levelDb = require('../level-db');

module.exports = function(target) {
    logger.info('Start to build "sitemap.xml" file', module);
    var hosts = config.get('hosts') || {};

    if(!target.getChanges().areModified()) {
        logger.warn('No changes were made during this synchronization. This step will be skipped', module);
        return vow.resolve(target);
    }

    if(!Object.keys(hosts).length) {
        logger.warn('No hosts were configured for creating sitemap.xml file. This step will be skipped', module);
        return vow.resolve(target);
    }

    return levelDb
        .getByCriteria(function(record) {
            var key = record.key,
                value = record.value;

            if(key.indexOf(target.KEY.NODE_PREFIX) < 0) {
                return false;
            }
            return value.hidden && _.isString(value.url) && !/^(https?:)?\/\//.test(value.url);
        })
        .then(function(records) {
            records = records.map(function(record) {
                return _.pick(record.value, 'url', 'hidden', 'search');
            });
            var map = records.reduce(function(prev, item) {
                Object.keys(hosts).forEach(function(lang) {
                    if(!item.hidden[lang]) {
                        prev.push(_.extend({ loc: hosts[lang] + item.url }, item.search));
                    }
                });
                return prev;
            }, []);

            return levelDb.put('sitemapXml', js2xml('urlset', { url: map }));
        })
        .then(function() {
            logger.info('Successfully create sitemap.xml file', module);
            return vow.resolve(target);
        })
        .fail(function(err) {
            logger.error(util.format('Creation of sitemap.xml file failed with error %s', err.message), module);
            return vow.reject(err);
        });
};
