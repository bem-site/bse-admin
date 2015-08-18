var Url = require('url'),
    path = require('path'),
    vow = require('vow'),
    should = require('should'),
    fsExtra = require('fs-extra'),
    levelDb = require('../../src/providers/level-db'),
    Target = require('../../src/targets/nodes'),
    task = require('../../src/tasks/override-links');

describe('override-links', function () {
    describe('replaceImageSources', function () {
        var node = {
                ghLibVersionUrl: 'https://github.com/org/lib',
                route: {
                    conditions: {
                        version: 'vx.y.z'
                    }
                }
            },
            doc = {
                url: 'https://github.com/user/repo/foo/bar.md'
            };

        it('should not replace image sources with empty src attributes', function () {
            var html = '<img title="foo">';
            task.replaceImageSources(html, node, null).should.equal(html);
        });

        it('should not replace image sources with absolute https links as src attributes', function () {
            var html = '<img src="https://my.site.com/image.png">';
            task.replaceImageSources(html, node, null).should.equal(html);
        });

        it('should not replace image sources with absolute http links as src attributes', function () {
            var html = '<img src="http://my.site.com/image.png">';
            task.replaceImageSources(html, node, null).should.equal(html);
        });

        /*
        it('should replace image sources (in case of missed doc param)', function () {
            var html = '<img src="./image.png">';
            $ = cheerio.load(html);
            task.replaceImageSources($, node, null).html()
                .should.equal('<img src="https://github.com/org/lib/blob/vx.y.z./image.png?raw=true">');
        });
        */

        it('should replace image sources (in case of existed doc param)', function () {
            var html = '<img src="./image.png">';
            task.replaceImageSources(html, node, doc)
                .should.equal('<img src="https://github.com/user/repo/foo/image.png?raw=true">');
        });
    });

    describe('hasUnsupportedProtocol', function () {
        it('should return false for relative urls', function () {
            task.hasUnsupportedProtocol(Url.parse('../foo/bar.md')).should.equal(false);
        });

        it('should return false for urls with http protocol', function () {
            task.hasUnsupportedProtocol(Url.parse('http://my.site.com/foo/bar.md')).should.equal(false);
        });

        it('should return false for urls with https protocol', function () {
            task.hasUnsupportedProtocol(Url.parse('https://my.site.com/foo/bar.md')).should.equal(false);
        });

        it('should return true for urls with non http(s) protocol', function () {
            task.hasUnsupportedProtocol(Url.parse('mailto://my.site.com/foo')).should.equal(true);
        });
    });

    describe('isAnchor', function () {
        it('should return false for relative link without anchor', function () {
            task.isAnchor(Url.parse('../foo/bar')).should.equal(false);
        });

        it('should return false for relative link with anchor', function () {
            task.isAnchor(Url.parse('../foo/bar#anchor')).should.equal(false);
        });

        it('should return false for absolute link without anchor', function () {
            task.isAnchor(Url.parse('http://my.site.com/foo/bar')).should.equal(false);
        });

        it('should return false for absolute link with anchor', function () {
            task.isAnchor(Url.parse('http://my.site.com/foo/bar#anchor')).should.equal(false);
        });

        it('should return true for anchor link', function () {
            task.isAnchor(Url.parse('#anchor')).should.equal(true);
        });
    });

    describe('isAbsolute', function () {
        it('should return false for relative urls (1)', function () {
            task.isAbsolute(Url.parse('../foo/bar.md')).should.equal(false);
        });

        it('should return false for relative urls (2)', function () {
            task.isAbsolute(Url.parse('./foo/bar.md')).should.equal(false);
        });

        it('should return false for relative urls (3)', function () {
            task.isAbsolute(Url.parse('/foo/bar.md')).should.equal(false);
        });

        it('should return false for absolute urls without protocol', function () {
            task.isAbsolute(Url.parse('//my.site.com/foo/bar.md')).should.equal(false);
        });

        it('should return false for urls with http protocol', function () {
            task.isAbsolute(Url.parse('http://my.site.com/foo/bar.md')).should.equal(true);
        });

        it('should return false for urls with https protocol', function () {
            task.isAbsolute(Url.parse('https://my.site.com/foo/bar.md')).should.equal(true);
        });

        it('should return true for urls with non http(s) protocol', function () {
            task.isAbsolute(Url.parse('mailto://my.site.com/foo')).should.equal(false);
        });
    });

    describe('isGithub', function () {
        it('should return false for non github absolute urls', function () {
            task.isGithub(Url.parse('https://my.site.com/foo/bar.md')).should.equal(false);
        });

        it('should return true for github (outer) absolute urls', function () {
            task.isGithub(Url.parse('https://github.com/foo/bar.md')).should.equal(true);
        });

        it('should return true for github (corporate) absolute urls', function () {
            task.isGithub(Url.parse('https://github.company.ru/foo/bar.md')).should.equal(true);
        });
    });

    describe('fixBroken', function () {
        it('should remove single ampersand symbol', function () {
           task.fixBroken('&').should.equal('');
        });

        it('should remove open bracket symbol on beginning of href', function () {
            task.fixBroken('(foo/bar').should.equal('foo/bar');
        });

        it ('should add missed protocol to github urls', function () {
            task.fixBroken('github.com/foo/bar').should.equal('https://github.com/foo/bar');
        });

        it ('should replace common protocol for github links to https', function () {
            task.fixBroken('//github.com/foo/bar').should.equal('https://github.com/foo/bar');
        });
    });

    describe('isNativeSiteLink', function () {
        it('should return true if link is one of existed (without trailing slash)', function () {
            task.isNativeSiteLink(Url.parse('/foo/bar1'), ['/foo/bar1', '/foo/bar2']).should.equal(true);
        });

        it('should return true if link is one of existed (with trailing slash)', function () {
            task.isNativeSiteLink(Url.parse('/foo/bar1/'), ['/foo/bar1', '/foo/bar2']).should.equal(true);
        });

        it('should return false if link is not one of existed', function () {
            task.isNativeSiteLink(Url.parse('/foo/bar3/'), ['/foo/bar1', '/foo/bar2']).should.equal(false);
        });
    });

    describe('buildFullGhUrlToSiblingDocument', function () {
        var repo = {
            host: 'github.com',
            user: 'user',
            repo: 'repo',
            ref: 'master',
            path: '/foo1/foo2/foo3.md'
        };

        it('should return given href if doc was not set', function () {
            task.buildFullGhUrlToRelativeDocument('../foo/bar.md', null, 'tree').should.equal('../foo/bar.md');
        });

        it('should return given href if doc.repo does not exists', function () {
            task.buildFullGhUrlToRelativeDocument('../foo/bar.md', {}, 'tree').should.equal('../foo/bar.md');
        });

        it('should resolve url to sibling document (1)', function () {
            task.buildFullGhUrlToRelativeDocument('bar.md', { repo: repo }, 'tree')
                .should.equal('https://github.com/user/repo/tree/master/foo1/foo2/bar.md');
        });

        it('should resolve url to sibling document (2)', function () {
            task.buildFullGhUrlToRelativeDocument('./bar.md', { repo: repo }, 'tree')
                .should.equal('https://github.com/user/repo/tree/master/foo1/foo2/bar.md');
        });

        it('should resolve url to parent document (1)', function () {
            task.buildFullGhUrlToRelativeDocument('../bar.md', { repo: repo }, 'tree')
                .should.equal('https://github.com/user/repo/tree/master/foo1/bar.md');
        });

        it('should resolve url to parent document (2)', function () {
            task.buildFullGhUrlToRelativeDocument('./../bar.md', { repo: repo }, 'tree')
                .should.equal('https://github.com/user/repo/tree/master/foo1/bar.md');
        });

        it('should resolve url to grand parent document (1)', function () {
            task.buildFullGhUrlToRelativeDocument('../../bar.md', { repo: repo }, 'tree')
                .should.equal('https://github.com/user/repo/tree/master/bar.md');
        });

        it('should resolve url to grand parent document (2)', function () {
            task.buildFullGhUrlToRelativeDocument('./../../bar.md', { repo: repo }, 'tree')
                .should.equal('https://github.com/user/repo/tree/master/bar.md');
        });
    });

    describe('buildFullGhUrlToJSONConfigurationFile', function () {
        var node = {
            ghLibVersionUrl: 'https://github.com/org/lib',
            route: {
                conditions: {
                    version: 'vx.y.z'
                }
            }
        };

        it('should return given href if url does not matched .json', function () {
            task.buildFullGhUrlToJSONConfigurationFile('../foo/bar.md', {}).should.equal('../foo/bar.md');
        });

        it('should return given href if url matches .json (tree)', function () {
            task.buildFullGhUrlToJSONConfigurationFile('package.json', node)
                .should.equal('https://github.com/org/lib/blob/vx.y.z/package.json');
        });
    });

    describe('buildFullGHUrlToNonDocumentationFile', function () {
        var node = {
                route: {
                    conditions: {
                        lib: 'my-lib',
                        version: 'vx.y.z'
                    }
                },
                ghLibVersionUrl: 'https://github.com/user/repo/my-lib'
            },
            assert = function (href, expected) {
                it('should build full site url for relative link ' + href, function () {
                    task.buildFullGHUrlToNonDocumentationFile(href, node).should.equal(expected);
                });
            };

        assert('common.blocks/button/button.js',
            'https://github.com/user/repo/my-lib/blob/vx.y.z/common.blocks/button/button.js');

        assert('./common.blocks/button/button.js',
            'https://github.com/user/repo/my-lib/blob/vx.y.z/common.blocks/button/button.js');

        assert('../common.blocks/button/button.js',
            'https://github.com/user/repo/my-lib/blob/vx.y.z/common.blocks/button/button.js');

        assert('./../common.blocks/button/button.js',
            'https://github.com/user/repo/my-lib/blob/vx.y.z/common.blocks/button/button.js');
    });

    describe('buildSiteUrlsForRelativeBlockLinksOnSameLevel', function () {
        var node = {
                route: {
                    conditions: {
                        lib: 'my-lib',
                        version: 'vx.y.z',
                        level: 'desktop'
                    }
                }
            },
            assert = function (href) {
                it('should build full site url for relative link ' + href, function () {
                    task.buildSiteUrlsForRelativeBlockLinksOnSameLevel(href, node)
                        .should.equal('/libs/my-lib/vx.y.z/desktop/button');
                });
            };

        assert('button.md');
        assert('/button.md');
        assert('./button.md');
        assert('../button/button.md');
        assert('button.ru.md');
        assert('/button.ru.md');
        assert('./button.ru.md');
        assert('../button/button.ru.md');
        assert('button.en.md');
        assert('/button.en.md');
        assert('./button.en.md');
        assert('../button/button.en.md');
        assert('button.html');
        assert('/button.html');
        assert('./button.html');
        assert('../button/button.html');
    });

    describe('buildSiteUrlsForRelativeBlockLinksOnDifferentLevel', function () {
        var node = {
                route: {
                    conditions: {
                        lib: 'my-lib',
                        version: 'vx.y.z',
                        level: 'touch'
                    }
                }
            },
            assert = function (href) {
                it('should build full site url for relative link ' + href, function () {
                    task.buildSiteUrlsForRelativeBlockLinksOnDifferentLevel(href, node)
                        .should.equal('/libs/my-lib/vx.y.z/desktop/button');
                });
            };

        assert('../../desktop.blocks/button.button.md');
        assert('./../desktop.blocks/button.button.md');
        assert('../../desktop.blocks/button.button.ru.md');
        assert('./../desktop.blocks/button.button.ru.md');
        assert('../../desktop.blocks/button.button.en.md');
        assert('./../desktop.blocks/button.button.en.md');
        assert('../../desktop.blocks/button.button.html');
        assert('./../desktop.blocks/button.button.html');
    });

    describe('buildSiteUrlsForLibraryDocLinks', function () {
        var node = {
                route: {
                    conditions: {
                        lib: 'my-lib',
                        version: 'vx.y.z'
                    }
                },
                ghLibVersionUrl: 'https://github.com/user/repo/my-lib'
            },
            assert = function (href, expected) {
                it('should build full site url for relative link ' + href, function () {
                    task.buildSiteUrlsForLibraryDocLinks(href, node).should.equal(expected);
                });
            };

        it('should return given href if route has not conditions', function () {
           task.buildSiteUrlsForLibraryDocLinks('./CHANGELOG.md', { route: {} }).should.equal('./CHANGELOG.md');
        });

        it('should return given href if route conditions has not lib', function () {
            task.buildSiteUrlsForLibraryDocLinks('./CHANGELOG.md',
                { route: { conditions: {} } }).should.equal('./CHANGELOG.md');
        });

        it('should return given href if route conditions has not versions', function () {
            task.buildSiteUrlsForLibraryDocLinks('./CHANGELOG.md',
                { route: { conditions: { lib: 'my-lib' } } }).should.equal('./CHANGELOG.md');
        });

        assert('common.blocks/button/button.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('./common.blocks/button/button.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('./../common.blocks/button/button.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('../common.blocks/button/button.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('common.blocks/button/button.ru.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('./common.blocks/button/button.ru.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('./../common.blocks/button/button.ru.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('../common.blocks/button/button.ru.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('common.blocks/button/button.en.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('./common.blocks/button/button.en.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('./../common.blocks/button/button.en.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('../common.blocks/button/button.en.md', '/libs/my-lib/vx.y.z/desktop/button');

        assert('desktop.blocks/button/button.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('./desktop.blocks/button/button.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('./../desktop.blocks/button/button.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('../desktop.blocks/button/button.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('desktop.blocks/button/button.ru.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('./desktop.blocks/button/button.ru.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('./../desktop.blocks/button/button.ru.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('../desktop.blocks/button/button.ru.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('desktop.blocks/button/button.en.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('./desktop.blocks/button/button.en.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('./../desktop.blocks/button/button.en.md', '/libs/my-lib/vx.y.z/desktop/button');
        assert('../desktop.blocks/button/button.en.md', '/libs/my-lib/vx.y.z/desktop/button');

        assert('touch.blocks/button/button.md', '/libs/my-lib/vx.y.z/touch/button');
        assert('./touch.blocks/button/button.md', '/libs/my-lib/vx.y.z/touch/button');
        assert('./../touch.blocks/button/button.md', '/libs/my-lib/vx.y.z/touch/button');
        assert('../touch.blocks/button/button.md', '/libs/my-lib/vx.y.z/touch/button');
        assert('touch.blocks/button/button.ru.md', '/libs/my-lib/vx.y.z/touch/button');
        assert('./touch.blocks/button/button.ru.md', '/libs/my-lib/vx.y.z/touch/button');
        assert('./../touch.blocks/button/button.ru.md', '/libs/my-lib/vx.y.z/touch/button');
        assert('../touch.blocks/button/button.ru.md', '/libs/my-lib/vx.y.z/touch/button');
        assert('touch.blocks/button/button.en.md', '/libs/my-lib/vx.y.z/touch/button');
        assert('./touch.blocks/button/button.en.md', '/libs/my-lib/vx.y.z/touch/button');
        assert('./../touch.blocks/button/button.en.md', '/libs/my-lib/vx.y.z/touch/button');
        assert('../touch.blocks/button/button.en.md', '/libs/my-lib/vx.y.z/touch/button');

        assert('1.2.3-changelog.md', '/libs/my-lib/1.2.3/changelog');
        assert('./1.2.3-changelog.md', '/libs/my-lib/1.2.3/changelog');
        assert('1.2.3-changelog.ru.md', '/libs/my-lib/1.2.3/changelog');
        assert('./1.2.3-changelog.ru.md', '/libs/my-lib/1.2.3/changelog');
        assert('1.2.3-changelog.en.md', '/libs/my-lib/1.2.3/changelog');
        assert('./1.2.3-changelog.en.md', '/libs/my-lib/1.2.3/changelog');
        assert('1.2.3-changelog.html', '/libs/my-lib/1.2.3/changelog');
        assert('./1.2.3-changelog.html', '/libs/my-lib/1.2.3/changelog');

        assert('CHANGELOG.md', '/libs/my-lib/vx.y.z/changelog');
        assert('./CHANGELOG.md', '/libs/my-lib/vx.y.z/changelog');
        assert('MIGRATION.md', '/libs/my-lib/vx.y.z/migration');
        assert('./MIGRATION.md', '/libs/my-lib/vx.y.z/migration');
        assert('README.md', '/libs/my-lib/vx.y.z');
        assert('./README.md', '/libs/my-lib/vx.y.z');
        assert('../README.md', '/libs/my-lib/vx.y.z');
        assert('./../README.md', '/libs/my-lib/vx.y.z');
    });

    describe('findReplacement', function () {
        var urlHash = {
                'https://github.com/user/repo/blob/master/foo/bar.md': '/foo/bar',
                'https://github.com/user/repo/blob/master/foo/README.md': '/foo/readme'
            },
            existedUrls = [
                '/libs/my-lib/vx.y.z/desktop/button'
            ];

        it('should find replacement for full github url', function () {
            task.findReplacement(['https://github.com/user/repo/blob/master/foo/bar.md'], urlHash, existedUrls)
                .should.equal('/foo/bar');
        });

        it('should find replacement for full github url (with readme)', function () {
            task.findReplacement(['https://github.com/user/repo/blob/master/foo'], urlHash, existedUrls)
                .should.equal('/foo/readme');
        });

        it('should find replacement in existed links array', function () {
            task.findReplacement(['/libs/my-lib/vx.y.z/desktop/button'], urlHash, existedUrls)
                .should.equal('/libs/my-lib/vx.y.z/desktop/button');
        });

        it('should not find any replacements', function () {
            should(task.findReplacement(['/libs/my-lib/vx.y.z/desktop/input'], urlHash, existedUrls)).equal(null);
        });
    });

    describe('replaceLinkHrefs', function () {
        var assert = function(html, expected, node, doc, urlHash, existedUrls) {
                it('should replace: ' + html + ' to: ' + expected, function () {
                    task.replaceLinkHrefs(html, node, doc, urlHash, existedUrls).should.equal(expected);
                });
            },
            node1 = {
                route: { conditions: { id: 'bar' } }
            },
            doc1 = {
                repo: {
                    host: 'github.com', user: 'user', repo: 'repo', ref: 'master', path: 'foo/bar1.md'
                }
            },
            node2 = {
                route: { conditions: { lib: 'my-lib', version: 'vx.y.z' }
                },
                ghLibVersionUrl: 'https://github.com/user/my-lib'
            },
            node3 = {
                route: { conditions: { lib: 'my-lib', version: 'vx.y.z', level: 'desktop', block: 'input' } }
            },
            node4 = {
                route: { conditions: { lib: 'my-lib', version: 'vx.y.z', id: 'migration' } }
            },
            urlHash1 = {
                'https://github.com/user/repo/my-lib/README.md': '/libs/my-lib/vx.y.z',
                'https://github.com/user/repo/tree/master/bar0.md': '/bar0',
                'https://github.com/user/repo/tree/master/foo/bar1.md': '/foo/bar1',
                'https://github.com/user/repo/blob/master/foo/bar2.md': '/foo/bar2'
            },
            existedUrls1 = [
                '/libs/my-lib/vx.y.z/desktop/button',
                '/libs/my-lib/vx.y.z/touch/button',
                '/libs/my-lib/vx.y.z',
                '/libs/my-lib/vx.y.z/changelog'
            ];

        assert('<a href="mailto://john.smit">bla</a>', '<a href="mailto://john.smit">bla</a>', {}, {}, {}, []);

        assert('<a href="#my-anchor">bla</a>', '<a href="#my-anchor">bla</a>', {}, {}, {}, []);

        assert('<a href="http://yandex.ru">bla</a>', '<a href="http://yandex.ru">bla</a>', {}, {}, {}, []);

        assert('<a href="/foo/bar">bla</a>', '<a href="/foo/bar">bla</a>', {}, {}, {}, ['/foo/bar']);

        assert('<a href="https://github.com/user/repo/tree/master/foo/bar1.md">bla</a>',
            '<a href="/foo/bar1">bla</a>', {}, {}, urlHash1, []);

        assert('<a href="https://github.com/user/repo/blob/master/foo/bar1.md">bla</a>',
            '<a href="/foo/bar1">bla</a>', {}, {}, urlHash1, []);

        assert('<a href="https://github.com/user/repo/tree/master/foo/bar2.md">bla</a>',
            '<a href="/foo/bar2">bla</a>', {}, {}, urlHash1, []);

        assert('<a href="https://github.com/user/repo/blob/master/foo/bar2.md">bla</a>',
            '<a href="/foo/bar2">bla</a>', {}, {}, urlHash1, []);

        assert('<a href="https://github.com/user/repo/tree/master/foo/bar1.md#anchor">bla</a>',
            '<a href="/foo/bar1#anchor">bla</a>', {}, {}, urlHash1, []);

        assert('<a href="bar2.md#anchor">bla</a>',
            '<a href="/foo/bar2#anchor">bla</a>', node1, doc1, urlHash1, []);

        assert('<a href="./bar2.md#anchor">bla</a>',
            '<a href="/foo/bar2#anchor">bla</a>', node1, doc1, urlHash1, []);

        assert('<a href="../bar0.md#anchor">bla</a>',
            '<a href="/bar0#anchor">bla</a>', node1, doc1, urlHash1, []);

        assert('<a href="https://github.com/user/repo/tree/master/bar00#anchor">bla</a>',
            '<a href="https://github.com/user/repo/tree/master/bar00#anchor">bla</a>', node1, doc1, urlHash1, []);

        assert('<a href="package.json">bla</a>',
            '<a href="https://github.com/user/my-lib/blob/vx.y.z/package.json">bla</a>', node2, {}, urlHash1, []);

        describe('relative block links in same level', function () {
            assert('<a href="button.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="button.ru.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="button.en.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="button.html">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="./button.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="./button.ru.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="./button.en.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="./button.html">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);
        });

        describe('relative block links on diferent levels', function () {
            assert('<a href="../button/button.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="../button/button.ru.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="../button/button.en.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="../button/button.html">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="../touch.blocks/button.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/touch/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="../touch.blocks/button.ru.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/touch/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="../touch.blocks/button.enmd">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/touch/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="../touch.blocks/button.html">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/touch/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="./../touch.blocks/button.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/touch/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="./../touch.blocks/button.ru.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/touch/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="./../touch.blocks/button.enmd">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/touch/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="./../touch.blocks/button.html">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/touch/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="../../touch.blocks/button.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/touch/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="../../touch.blocks/button.ru.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/touch/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="../../touch.blocks/button.enmd">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/touch/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="../../touch.blocks/button.html">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/touch/button">bla</a>', node3, {}, {}, existedUrls1);
        });

        describe('relative links from lib docs to blocks', function () {
            assert('<a href="common.blocks/button/button.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="./common.blocks/button/button.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="../common.blocks/button/button.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="./../common.blocks/button/button.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="common.blocks/button/button.ru.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="./common.blocks/button/button.ru.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="../common.blocks/button/button.ru.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="./../common.blocks/button/button.ru.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="common.blocks/button/button.en.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="./common.blocks/button/button.en.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="../common.blocks/button/button.en.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="./../common.blocks/button/button.en.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="common.blocks/button/button.html">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="./common.blocks/button/button.html">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="../common.blocks/button/button.html">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="./../common.blocks/button/button.html">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/desktop/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="touch.blocks/button/button.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/touch/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="./touch.blocks/button/button.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/touch/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="../touch.blocks/button/button.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/touch/button">bla</a>', node3, {}, {}, existedUrls1);

            assert('<a href="./../touch.blocks/button/button.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/touch/button">bla</a>', node3, {}, {}, existedUrls1);
        });

        describe('relative links from lib docs to lib docs', function () {
            assert('<a href="changelog">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/changelog">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="./changelog">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/changelog">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="../changelog">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/changelog">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="./../changelog">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/changelog">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="changelog.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/changelog">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="./changelog.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/changelog">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="../changelog.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/changelog">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="./../changelog.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/changelog">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="changelog.ru.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/changelog">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="./changelog.ru.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/changelog">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="../changelog.ru.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/changelog">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="./../changelog.ru.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/changelog">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="changelog.en.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/changelog">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="./changelog.en.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/changelog">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="../changelog.en.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/changelog">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="./../changelog.en.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/changelog">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="changelog.html">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/changelog">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="./changelog.html">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/changelog">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="../changelog.html">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/changelog">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="./../changelog.html">bla</a>',
                '<a href="/libs/my-lib/vx.y.z/changelog">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="./../readme">bla</a>',
                '<a href="/libs/my-lib/vx.y.z">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="readme.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="./readme.ru.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z">bla</a>', node4, {}, {}, existedUrls1);

            assert('<a href="../readme.en.md">bla</a>',
                '<a href="/libs/my-lib/vx.y.z">bla</a>', node4, {}, {}, existedUrls1);
        });

        describe('relative links non-documentation files', function () {
            assert('<a href="common.blocks/button/button.js">bla</a>',
                '<a href="https://github.com/user/my-lib/blob/vx.y.z/common.blocks/button/button.js">bla</a>', node2, {}, {}, existedUrls1);

            assert('<a href="./common.blocks/button/button.js">bla</a>',
                '<a href="https://github.com/user/my-lib/blob/vx.y.z/common.blocks/button/button.js">bla</a>', node2, {}, {}, existedUrls1);

            assert('<a href="../common.blocks/button/button.js">bla</a>',
                '<a href="https://github.com/user/my-lib/blob/vx.y.z/common.blocks/button/button.js">bla</a>', node2, {}, {}, existedUrls1);

            assert('<a href="./../common.blocks/button/button.js">bla</a>',
                '<a href="https://github.com/user/my-lib/blob/vx.y.z/common.blocks/button/button.js">bla</a>', node2, {}, {}, existedUrls1);
        });
    });

    describe('real tests', function () {
        var existedUrls, urlsHash;

        before(function () {
            urlsHash = fsExtra.readJSONSync('./test/fixtures/urlsHash.json');
            existedUrls = fsExtra.readJSONSync('./test/fixtures/existedUrls.json');
        });

        it ('should override "../button/button.ru.md" on page "/libs/bem-components/v2.3.0/desktop/attach"', function () {
            var node = {
                route: {
                    conditions: { lib: 'bem-components', version: 'v2.3.0', level: 'desktop', block: 'attach' }
                }
            };
            task.replaceLinkHrefs('<a href="../button/button.ru.md">bla</a>', node, {}, urlsHash, existedUrls)
                .should.equal('<a href="/libs/bem-components/v2.3.0/desktop/button">bla</a>');
        });

        it ('should override "https://github.com/bem/bem-components/blob/v2/.csscomb.json" on page "/talks/beminar-css-2015/"', function () {
           var node = {
                    route: {
                        conditions: { category: 'talks', id: 'beminar-css-2015' }
                    }
                },
                doc = {
                    repo: { host: 'github.com', user: 'bem', repo: 'bem-method', ref: 'bem-info-data', path: 'video/beminar-css-2015/beminar-css-2015.ru.md'}   
                };
            task.replaceLinkHrefs('<a href="https://github.com/bem/bem-components/blob/v2/.csscomb.json">bla</a>', node, doc, urlsHash, existedUrls)
                .should.equal('<a href="https://github.com/bem/bem-components/blob/v2/.csscomb.json">bla</a>'); 
            });
    });

    describe('overrideLinks', function () {
        it('should return content if it is not string', function () {
            task.overrideLinks(1, null,  null, {}).should.equal(1);
            should(task.overrideLinks(null, null, null, {})).equal(null);
        });
    });

    describe('db-methods', function () {
        var dbFolder, target;

        before(function () {
            dbFolder = path.join(process.cwd(), './db');
            fsExtra.mkdirpSync(dbFolder);
            target = new Target({});
            return levelDb.init(dbFolder);
        });

        describe('collectUrls', function () {
            before(function () {
                return levelDb.get().batch([
                    {
                        type: 'put',
                        key: 'nodes:1',
                        value: {
                            id: '1',
                            url: '/foo/bar1',
                            hidden: { en: false, ru: false }
                        }
                    },
                    {
                        type: 'put',
                        key: 'nodes:2',
                        value: {
                            id: '2',
                            url: '/foo/bar2',
                            hidden: { en: false, ru: false }
                        }
                    },
                    {
                        type: 'put',
                        key: 'docs:1:en',
                        value: {
                            id: 'docs:1:en',
                            url: 'https://github.com/user/repo/blob/master/foo/bar.md'
                        }
                    }
                ]);
            });

            it('should returns promise with resolved object', function () {
                return task.collectUrls(target).then(function (existed) {
                    existed.should.be.instanceOf(Object);
                });
            });

            it('should returns promise with resolved object with "urlsHash" field', function () {
                return task.collectUrls(target).then(function (existed) {
                    existed.urlsHash.should.be.instanceOf(Object);
                });
            });

            it('should returns promise with resolved object with "existedUrls" field', function () {
                return task.collectUrls(target).then(function (existed) {
                    existed.existedUrls.should.be.instanceOf(Array);
                });
            });

            it('should return valid urlHash data', function () {
                return task.collectUrls(target).then(function (existed) {
                    should.deepEqual(existed.urlsHash, {
                        'https://github.com/user/repo/blob/master/foo/bar.md': '/foo/bar1'
                    });
                });
            });

            it('should return valid existedUrls data', function () {
                return task.collectUrls(target).then(function (existed) {
                    should.deepEqual(existed.existedUrls, ['/foo/bar1', '/foo/bar2']);
                });
            });

            after(function () {
                return levelDb.get().batch([
                    { type: 'del', key: 'nodes:1' },
                    { type: 'del', key: 'nodes:2' },
                    { type: 'del', key: 'docs:1' }
                ]);
            });
        });

        describe('getDocumentRecordsFromDb', function () {
            before(function () {
                return levelDb.get().batch([
                    { type: 'put', key: 'nodes:1', value: { id: '1', view: 'post', route: {} } },
                    { type: 'put', key: 'nodes:2', value: { id: '2', view: 'index', route: {} } },
                    { type: 'put', key: 'nodes:3', value: { view: 'post', route: {
                            conditions: { lib: 'my-lib', version: 'v1.2.3' }
                        }
                    }},
                    { type: 'put', key: 'nodes:4', value: { view: 'post', route: {
                        conditions: { lib: 'my-lib', version: 'v3.4.5' }
                    }
                    }},
                    { type: 'put', key: 'nodes:5', value: { view: 'post', route: {
                        conditions: { lib: 'my-lib2', version: 'v1.2.3' }
                    }
                    }}
                ]);
            });

            it ('should select only non-library documents', function () {
                return task.getDocumentRecordsFromDb(target, []).then(function (records) {
                    records.should.be.instanceOf(Array).and.have.length(1);
                    should.deepEqual(records[0].value, { id: '1', view: 'post', route: {} });
                });
            });

            it ('should select library documents of given library', function () {
                return task.getDocumentRecordsFromDb(target, [{ lib: 'my-lib2', version: 'v1.2.3' }])
                    .then(function (records) {
                        records.should.be.instanceOf(Array).and.have.length(2);
                        should.deepEqual(records[0].value, { id: '1', view: 'post', route: {} });
                        should.deepEqual(records[1].value, { view: 'post', route: {
                            conditions: { lib: 'my-lib2', version: 'v1.2.3' } }
                        });
                    });
            });

            it ('should select library documents of given library version', function () {
                return task.getDocumentRecordsFromDb(target, [{ lib: 'my-lib', version: 'v3.4.5' }])
                    .then(function (records) {
                        records.should.be.instanceOf(Array).and.have.length(2);
                        should.deepEqual(records[0].value, { id: '1', view: 'post', route: {} });
                        should.deepEqual(records[1].value, { view: 'post', route: {
                            conditions: { lib: 'my-lib', version: 'v3.4.5' } }
                        });
                    });
            });

            after(function () {
                return levelDb.get().batch([
                    { type: 'del', key: 'nodes:1' },
                    { type: 'del', key: 'nodes:2' },
                    { type: 'del', key: 'nodes:3' },
                    { type: 'del', key: 'nodes:4' },
                    { type: 'del', key: 'nodes:5' }
                ]);
            });
        });

        describe('getBlockRecordsFromDb', function () {
            before(function () {
                return levelDb.get().batch([
                    { type: 'put', key: 'nodes:1', value: { view: 'post', route: {
                        conditions: { lib: 'my-lib', version: 'v1.2.3' }
                    } } },
                    { type: 'put', key: 'nodes:2', value: { view: 'block', route: {
                        conditions: { lib: 'my-lib', version: 'v1.2.3' }
                    } } },
                    { type: 'put', key: 'nodes:3', value: { view: 'block', route: {
                        conditions: { lib: 'my-lib', version: 'v1.2.3' }
                    }, source: { data: {} } } },
                    { type: 'put', key: 'nodes:4', value: { view: 'block', route: {
                        conditions: { lib: 'my-lib', version: 'v3.4.5' }
                    }, source: { data: {} } } },
                    { type: 'put', key: 'nodes:5', value: { view: 'block', route: {
                        conditions: { lib: 'my-lib2', version: 'v1.2.3' }
                    }, source: { data: {} } } }
                ]);
            });

            it('should select only records with source and view equal to "post"', function () {
                return task.getBlockRecordsFromDb(target, [
                    { lib: 'my-lib', version: 'v1.2.3' },
                    { lib: 'my-lib', version: 'v3.4.5' },
                    { lib: 'my-lib2', version: 'v1.2.3' }
                ]).then(function (records) {
                    records.should.be.instanceOf(Array).and.have.length(3);
                });
            });

            it('should select only records for given library', function () {
                return task.getBlockRecordsFromDb(target, [
                    { lib: 'my-lib', version: 'v1.2.3' },
                    { lib: 'my-lib', version: 'v3.4.5' }
                ]).then(function (records) {
                    records.should.be.instanceOf(Array).and.have.length(2);
                    should.deepEqual(records[0].value, { view: 'block', route: {
                        conditions: { lib: 'my-lib', version: 'v1.2.3' }
                    }, source: { data: {} } });
                    should.deepEqual(records[1].value, { view: 'block', route: {
                        conditions: { lib: 'my-lib', version: 'v3.4.5' }
                    }, source: { data: {} } });
                });
            });

            it('should select only records for given library version', function () {
                return task.getBlockRecordsFromDb(target, [
                    { lib: 'my-lib', version: 'v3.4.5' }
                ]).then(function (records) {
                    records.should.be.instanceOf(Array).and.have.length(1);
                    should.deepEqual(records[0].value, { view: 'block', route: {
                        conditions: { lib: 'my-lib', version: 'v3.4.5' }
                    }, source: { data: {} } });
                });
            });

            after(function () {
                return levelDb.get().batch([
                    { type: 'del', key: 'nodes:1' },
                    { type: 'del', key: 'nodes:2' },
                    { type: 'del', key: 'nodes:3' },
                    { type: 'del', key: 'nodes:4' },
                    { type: 'del', key: 'nodes:5' }
                ]);
            });
        });

        after(function () {
            levelDb.get().disconnect();
            fsExtra.removeSync(dbFolder);
        });
    });
});
