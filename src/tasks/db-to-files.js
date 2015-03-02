var util = require('util'),
    path = require('path'),

    _ = require('lodash'),
    vow = require('vow'),
    vowFs = require('vow-fs'),

    levelDb = require('../providers/level-db'),
    utility = require('../util'),
    logger = require('../logger');

function exportPages (target, model, snapshotPath) {
    function getDocByNodeId(arr, id, lang) {
        return _.find(arr, function (item) {
            return item.key === util.format('%s%s:%s', target.KEY.DOCS_PREFIX, id, lang);
        });
    }
    model.nodes = [];
    var docsPath = path.join(snapshotPath, 'docs');
    return vowFs.makeDir(docsPath)
        .then(function () {
            return vow.all([
                levelDb.get().getByKeyRange(target.KEY.NODE_PREFIX, target.KEY.PEOPLE_PREFIX),
                levelDb.get().getByKeyRange(target.KEY.DOCS_PREFIX, target.KEY.NODE_PREFIX)
            ]);
        })
        .spread(function (nodeRecords, docRecords) {
            return nodeRecords.map(function (prev, nodeRecord) {
                var node = nodeRecord.value,
                    doc;

                utility.getLanguages().forEach(function (lang) {
                    doc = getDocByNodeId(docRecords, node.id, lang);
                    if (doc) {
                        node.source = node.source || {};
                        node.source[lang] = doc;
                    }
                });
                return node;
            }, {});
        })
        .then(function (nodes) {
            var portionSize = 20;
            nodes = utility.separateArrayOnChunks(nodes, portionSize);
            return nodes.reduce(function (prev, item, index) {
                prev = prev.then(function () {
                    logger.debug(util.format('save doc files in range %s - %s',
                        index * portionSize, (index + 1) * portionSize), module);
                    return vow.all(item.map(function (_item) {
                        model.nodes.push(_item);
                        if (!_item.source) {
                            return vow.resolve();
                        }
                        return vow.all(utility.getLanguages().map(function (lang) {
                            var fName = docsPath + '/' + _item.id + '.' + lang;
                            return (_item.source[lang] && _item.source[lang].content) ?
                                vowFs.write(fName, _item.source[lang].content, 'utf-8') : vow.resolve();
                        }));
                    }));
                });
                return prev;
            }, vow.resolve());
        })
        .then(function () {
            return model;
        });
}

function exportBlocks (target, model, snapshotPath) {
    var blockDataPath = path.join(snapshotPath, 'blocks', 'data'),
        blockJSDocPath = path.join(snapshotPath, 'blocks', 'jsdoc');
    return vow
        .all([
            vowFs.makeDir(blockDataPath),
            vowFs.makeDir(blockJSDocPath)
        ])
        .then(function () {
            return vow.all([
                levelDb.get().getByKeyRange(target.KEY.BLOCKS_PREFIX + 'data:', target.KEY.BLOCKS_PREFIX + 'jsdoc:'),
                levelDb.get().getByKeyRange(target.KEY.BLOCKS_PREFIX + 'jsdoc:', target.KEY.DOCS_PREFIX)
            ]);
        })
        .spread(function (data, jsdoc) {
            var portionSize = 20;
            data = utility.separateArrayOnChunks(data, portionSize);
            jsdoc = utility.separateArrayOnChunks(jsdoc, portionSize);

            var saveData = data.reduce(function (prev, item, index) {
                    prev = prev.then(function () {
                        logger.debug(util.format('save data files in range %s - %s',
                            index * portionSize, (index + 1) * portionSize), module);
                        return vow.all(item.map(function (_item) {
                            return vowFs.write(blockDataPath + '/' + _item.key.split(':').pop(), _item.value, 'utf-8');
                        }));
                    });
                    return prev;
                }, vow.resolve()),
                saveJSDoc = jsdoc.reduce(function (prev, item, index) {
                    prev = prev.then(function () {
                        logger.debug(util.format('save jsdoc files in range %s - %s',
                            index * portionSize, (index + 1) * portionSize), module);
                        return vow.all(item.map(function (_item) {
                            return vowFs.write(blockJSDocPath + '/' + _item.key.split(':').pop(), _item.value, 'utf-8');
                        }));
                    });
                    return prev;
                }, vow.resolve());
            return vow.all([saveData, saveJSDoc]);
        })
        .then(function () {
            return model;
        });
}

function exportAuthors (target, model) {
    logger.debug('Export authors', module);
    return levelDb.get().get(target.KEY.AUTHORS).then(function (result) {
        model.translators = result || [];
        return model;
    });
}

function exportTranslators (target, model) {
    logger.debug('Export translators', module);
    return levelDb.get().get(target.KEY.TRANSLATORS).then(function (result) {
        model.translators = result || [];
        return model;
    });
}

function exportTags (target, model) {
    logger.debug('Export tags', module);
    return levelDb.get().get(target.KEY.TAGS).then(function (result) {
        model.tags = result || [];
        return model;
    });
}

module.exports = function (target) {
    logger.info('Start to export database to files', module);

    if (!target.getChanges().areModified()) {
        logger.warn('No changes were made during this synchronization. This step will be skipped', module);
        return vow.resolve(target);
    }

    var snapshotName = utility.getSnapshotName(),
        snapshotPath = path.join(target.SNAPSHOTS_DIR, snapshotName),
        model = {};

    target.setSnapshotName(snapshotName);

    return vowFs.makeDir(snapshotPath)
        .then(function () {
            return exportPages(model);
        })
        .then(function (m) {
            return exportBlocks(target, m, snapshotPath);
        })
        .then(function (m) {
            return exportAuthors(target, m);
        })
        .then(function (m) {
            return exportTranslators(target, m);
        })
        .then(function (m) {
            return exportTags(target, m);
        })
        .then(function () {
            logger.info(util.format('Files snapshot %s has been created successfully', snapshotName), module);
            return vow.resolve(target);
        });
};
