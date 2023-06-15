var express = require('express');
var router = express.Router();

function isLoggedIn(request, response, next) {
    if (request.isAuthenticated()) {
        return next();
    } else {
        response.redirect('/login');
    }
}

/* GET home page. */
router.get('/', isLoggedIn, function(request, response, next) {
  response.render('index', { title: 'Express' });
});

router.get('/login', function (request, response, next) {
    if (request.user) {
        response.render('/login');
    } else {
        response.render('/login', { title: "Login page", user: request.user });
    }
}); 

router.get('/logout', isLoggedIn, function (request, response, next) {
    request.logout(function (error) {
        if (error) {
            return next(error);
        }
        response.redirect('/login');
    });
});

module.exports = router;
