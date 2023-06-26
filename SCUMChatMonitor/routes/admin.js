var express = require('express');
var router = express.Router();

function isLoggedIn(request, response, next) {
    if (request.isAuthenticated()) {
        return next();
    } else {
        response.redirect('/login');
    }
}
router.get('/login-success', isLoggedIn, function (request, response, next) {
    response.render('admin/index', {
        title: `Admin dashboard`,
        message: `You have successfully logged in`,
        admin: request.admin
    });
});

router.get('/', isLoggedIn, function (request, response, next) {
    response.render('admin/index', { title: 'Test title' });
});

module.exports = router;