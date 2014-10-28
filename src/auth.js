var util = require('util'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    Users = function () {
        this.init();
    },
    users;

Users.prototype = {
    users: [],

    init: function () {
        this.users = [
            { id: 1, username: 'bemer', password: 'bemer', email: 'bemer@yandex-team.ru' },
            { id: 2, username: 'tavria', password: 'tavria', email: 'tavria@yandex-team.ru' }
        ];
    },

    findById: function (id, callback) {
        var user = this.users.filter(function (item) {
            return item.id === id;
        })[0];

        if (user) {
            callback(null, user);
        } else {
            callback(new Error('User ' + id + ' does not exist'));
        }
    },

    findByUserName: function (username, callback) {
        var user = this.users.filter(function (item) {
            return item.username === username;
        })[0];

        return callback(null, user ? user : null);
    }
};

exports.init = function () {
    users = new Users();

    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function (id, done) {
        users.findById(id, function (err, user) {
            done(err, user);
        });
    });

    passport.use(new LocalStrategy(
        function (username, password, done) {
            users.findByUserName(username, function (err, user) {
                if (err) { return done(err); }
                if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
                if (user.password !== password) { return done(null, false, { message: 'Invalid password' }); }
                return done(null, user);
            });
        }
    ));
};

exports.ensureAuthenticated = function (req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/login');
};

exports.authenticate = function (redirect) {
    return passport.authenticate('local', { failureRedirect: redirect });
};

exports.getPassport = function () {
    return passport;
};
