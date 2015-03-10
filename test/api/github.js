var should = require('should'),
    Github = require('../../src/api/github');

describe('api/github', function () {
    describe('initialization', function () {
        it('without tokens', function () {
            new Github({});
        });
    });

    describe('after initialization', function () {
        var gh;

        before(function () {
            gh = new Github({});
        });

        it('should have private API', function () {
            gh.get({ type: 'private' }).should.be.ok;
            gh.get({ type: 'private' }).type.should.equal('private');
        });

        it('should have public API', function () {
            gh.get({ type: 'public' }).should.be.ok;
            gh.get({ type: 'public' }).type.should.equal('public');
        });
    });

    describe('api calls', function () {
        var gh;
        before(function () {
            gh = new Github({});
        });

        it('should get content of given file', function (done) {
            var o = {
                type: 'public',
                user: 'bem-site',
                repo: 'bse-admin',
                ref: 'master',
                path: 'README.md'
            };
            gh.get(o).getContent(o, null, function (error, result) {
                should(error).not.be.ok;
                result.should.be.ok;
                result.content.should.be.ok;
                result.name.should.equal('README.md');
                result.type.should.equal('file');
                result['html_url' ].should.equal('https://github.com/bem-site/bse-admin/blob/master/README.md');
                done();
            });
        });

        it('should get commits for given file', function (done) {
            var o = {
                type: 'public',
                user: 'bem-site',
                repo: 'bse-admin',
                path: 'README.md'
            };

            gh.get(o).getCommits(o, null, function (error, result) {
                should(error).not.be.ok;
                result.should.be.ok;
                result.should.be.instanceof(Array);
                done();
            });
        });

        it('should get branch information for given branch name', function (done) {
            var o = {
                type: 'public',
                user: 'bem-site',
                repo: 'bse-admin',
                branch: 'master'
            };

            gh.get(o).getBranch(o, null, function (error, result) {
                should(error).not.be.ok;
                result.should.be.ok;
                result.name.should.equal('master');
                result.commit.should.be.ok;
                done();
            });
        });

        it('should get repository information', function (done) {
            var o = {
                type: 'public',
                user: 'bem-site',
                repo: 'bse-admin'
            };

            gh.get(o).getRepo(o, null, function (error, result) {
                should(error).not.be.ok;
                result.should.be.ok;
                result.url.should.equal('https://api.github.com/repos/bem-site/bse-admin');
                result.private.should.equal(false);
                result.name.should.equal('bse-admin');
                result['html_url'].should.equal('https://github.com/bem-site/bse-admin');
                done();
            });
        });

        it('should return default branch name', function (done) {
            var o = {
                type: 'public',
                user: 'bem-site',
                repo: 'bse-admin'
            };

            gh.get(o).getDefaultBranch(o, null, function (error, result) {
                should(error).not.be.ok;
                result.should.be.ok;
                result.should.equal('master');
                done();
            });
        });

        it('should return true for existed branch', function (done) {
            var o = {
                type: 'public',
                user: 'bem-site',
                repo: 'bse-admin',
                branch: 'master'
            };
            gh.get(o).isBranchExists(o, null, function (error, result) {
                should(error).not.be.ok;
                result.should.be.ok;
                result.should.be.true;
                done();
            });
        });

        it('should return false for non-existed branch', function (done) {
            var o = {
                type: 'public',
                user: 'bem-site',
                repo: 'bse-admin',
                branch: 'invalid'
            };
            gh.get(o).isBranchExists(o, null, function (error, result) {
                should(error).not.be.ok;
                result.should.not.be.ok;
                result.should.be.false;
                done();
            });
        });
    });
});
