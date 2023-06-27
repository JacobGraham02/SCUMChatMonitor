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
    const parent_directory_from_routes_folder = path.resolve(__dirname, '..');
    fs.readdir(path.join(parent_directory_from_routes_folder, '/commands'), (error, files) => {
        
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

router.get('/commands/:file', (request, response) => {
    const file_name = request.params.file;
    const parent_directory_from_routes = path.resolve(__dirname, '..');   
    fs.readFile(path.join(parent_directory_from_routes, '/commands', file_name), 'utf-8', function (error, data) {
        if (error) {
            console.error(error);
            return;
        }
        response.render('admin/command', { code: data, filename: file_name });
    });
});

/*router.post('commands/:file', (request, response) => {
    const file_name = request.params.file;
    const parent_directory_from_routes = path.resolve(__dirname, '..');
    const new_form_script_code = request.body.code;
    fs.readFile(path.join(parent_directory_from_routes, '/commands', file_name), 'utf-8', function (error, data) {
        if (error) {
            console.error(error);
            return response.status(500).send("There was a file saving error. Please try again");
        }
        response.redirect('admin/command/' + file_name);
    });
});
*/

/*router.get('commands/:file', (request, response) => {
    const file_name = request.params.file;
    response.render('admin/index');
    console.log(file_name);
    fs.readFile(path.join(__dirname, '/commands'))
});*/
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