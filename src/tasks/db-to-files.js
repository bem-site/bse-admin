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
            return nodeRecords
                .map(function (nodeRecord) {
                    var node = nodeRecord.value,
                        doc;

                    utility.getLanguages().forEach(function (lang) {
                        doc = getDocByNodeId(docRecords, node.id, lang);
                        if (doc) {
                            node.source = node.source || {};
                            node.source[lang] = doc.value;
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

function _saveBlock(data, filePath, portionSize) {
    return data.reduce(function (prev, item, index) {
        prev = prev.then(function () {
            logger.debug(util.format('save data files in range %s - %s',
                index * portionSize, (index + 1) * portionSize), module);
            return vow.all(item.map(function (_item) {
                return vowFs.write(filePath + '/' + _item.key.split(':').pop(), _item.value, 'utf-8');
            }));
        });
        return prev;
    }, vow.resolve());
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
            return vow.all([
                _saveBlock(utility.separateArrayOnChunks(data, portionSize), blockDataPath, portionSize),
                _saveBlock(utility.separateArrayOnChunks(jsdoc, portionSize), blockJSDocPath, portionSize)
            ]);
        })
        .then(function () {
            return model;
        });
}

function exportCollected(model, key) {
    logger.debug(util.format('Export %s', key), module);
    return levelDb.get().get(key).then(function (result) {
        model[key] = result || [];
        return model;
    });
}

module.exports = function (target) {
    logger.info('Start to export database to files', module);

    var dataPath = target.DB_DIR,
        model = {};

    return vowFs.makeDir(dataPath)
        .then(function () {
            return exportPages(target, model, dataPath);
        })
        .then(function (m) {
            return exportBlocks(target, m, dataPath);
        })
        .then(function (m) {
            return vow
                .all([
                    exportCollected(m, target.KEY.AUTHORS),
                    exportCollected(m, target.KEY.TRANSLATORS),
                    exportCollected(m, target.KEY.TAGS)
                ])
                .then(function () {
                    return model;
                });
        })
        .then(function (m) {
            return vowFs.write(path.join(dataPath, 'db.json'), JSON.stringify(m), 'utf-8');
        })
        .then(function () {
            return vow.resolve(target);
        });
};
