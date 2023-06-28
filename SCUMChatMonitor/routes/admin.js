var express = require('express');
var router = express.Router();
const fs = require('fs');
var path = require('path');
const extractFromUserCommands = require('../modules/extractDataFromCommands');

function isLoggedIn(request, response, next) {
    if (request.isAuthenticated()) {
        return next();
    } else {
        response.redirect('/login');
    }
}

router.get(['/login-success','/commands'], isLoggedIn, function (request, response, next) {
    const parent_directory_from_routes_folder = path.resolve(__dirname, '..');
    fs.readdir(path.join(parent_directory_from_routes_folder, '/commands'), (error, files) => {
        
        if (error) {
            console.error(error);
            return;
        };
        response.render('admin/index', {
            title: `Admin dashboard`,
            message: `You have successfully logged in`,
            command_files: files
        });
    });
});

router.get('/commands/:file', (request, response) => {
    const file_path = request.params.file;
    const javascript_file_name = path.basename(file_path);
    const parent_directory_from_routes = path.resolve(__dirname, '..');   
    fs.readFile(path.join(parent_directory_from_routes, '/commands', javascript_file_name), 'utf-8', function (error, data) {
        if (error) {
            console.error(error);
            return;
        }
        const command_data_text = extractFromUserCommands.fetchCommandDataFromCommand(data);
        const authorization_roles_data_text = extractFromUserCommands.fetchAuthorizationRolesFromCommand(data);
        response.render('admin/command', { code: data, command_data: command_data_text, authorization_roles: authorization_roles_data_text, file_name: javascript_file_name });
    });
});

function fetchAllCommandFilesData(request) {
    const file_path = request.params.file;

}

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
});*/

router.get('/', isLoggedIn, function (request, response, next) {
    const parent_directory_from_routes_folder = path.resolve(__dirname, '..');
    fs.readdir(path.join(parent_directory_from_routes_folder, '/commands'), (error, files) => {

        if (error) {
            console.error(error);
            return; 
        }

        response.render('admin/index', { title: 'Test title', command_files: files });
    });
});

module.exports = router;