var express = require('express');
var router = express.Router();
const fs = require('fs');
var path = require('path');

function isLoggedIn(request, response, next) {
    if (request.isAuthenticated()) {
        return next();
    } else {
        response.redirect('/login');
    }
}

router.get('/login-success', isLoggedIn, function (request, response, next) {
    fs.readdir(path.join(__dirname, '../commands'), (error, files) => {
        if (error) {
            console.error(error);
            return;
        };
        response.render('admin/index', {
            title: `Admin dashboard`,
            message: `You have successfully logged in`,
            admin: request.admin,
            command_files: files
        });
    });
});

/*router.get('commands/:file', (request, response) => {
    const file_name = request.params.file;

    fs.readFile(path.join(__dirname, '../commands', file_name), 'utf8', (error, data) => {
        if (error) {
            console.error(error);
            return;
        }
        response.json({ content: data });
    });
});*/

router.get('/', isLoggedIn, function (request, response, next) {
    response.render('admin/index', { title: 'Test title' });
});

module.exports = router;