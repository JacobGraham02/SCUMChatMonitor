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
            command_files: files,
            user: request.user
        });
    });
});

router.get('/commands/new', isLoggedIn, (request, response) => {
    response.render('admin/new_command', { title: 'Create new command' });
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

router.delete('/commands/delete/:file', (request, response) => {
    const file_path = request.params.file;
    const javascript_file_path = path.basename(file_path);
    const parent_directory_from_routes = path.resolve(__dirname, '..');
    const full_path = path.join(parent_directory_from_routes, '/commands', javascript_file_path);

    fs.unlinkSync(full_path);
    console.log(`File ${full_path} was successfully deleted`);
    response.status(200).send(`File ${full_path} was successfully deleted`);
});

router.post('/commands/new', isLoggedIn, (request, response, next) => {
    const new_command_name = request.body.command_name_input;
    const new_command_description = request.body.command_description_input;
    const new_command_data = request.body.command_data_input;
    const new_command_authorized_roles = request.body.command_authorized_roles_input;
    const parent_directory_from_routes = path.resolve(__dirname, '..');
    const file_path = path.join(parent_directory_from_routes, '/commands', new_command_name + '.js');

    const command_content = `
    const { SlashCommandBuilder } = require('@discordjs/builders');
    
module.exports = {
    data: new SlashCommandBuilder()
         .setName('${new_command_name}')
         .setDescription('${new_command_description}'),
    command_data: '${new_command_data}',
    authorization_role_name: ['${new_command_authorized_roles}'],

    async execute(message) {

    }
}`;

    fs.writeFileSync(file_path, command_content, 'utf-8');
    response.redirect('/admin/');
});

router.post('/commands/:filename', function (request, response) {

    const file_name = request.params.filename;
    const form_authorized_roles = request.body.authorization_role_name;
    const form_command_data = request.body.command_data;

    const parent_directory_from_routes = path.resolve(__dirname, '..');
    const file_path = path.join(parent_directory_from_routes, '/commands', file_name);

    //const file_path = path.join(__dirname, '/commands', file_name);
    const file_content = fs.readFileSync(file_path, 'utf-8');

    const updated_file_content = file_content.replace(/command_data:\s*'([\s\S]*?)',/, `command_data: '${form_command_data}',`)
        .replace(/authorization_role_name:\s*\[(.*?)\],/, `authorization_role_name: [${form_authorized_roles}],`);

    fs.writeFileSync(file_path, updated_file_content, 'utf-8');

    response.redirect('/admin/');
});

router.get('/', isLoggedIn, function (request, response, next) {
    const parent_directory_from_routes_folder = path.resolve(__dirname, '..');
    fs.readdir(path.join(parent_directory_from_routes_folder, '/commands'), (error, files) => {

        if (error) {
            console.error(error);
            return; 
        }
        console.log(`Request user is: ${(request.user.admin_username)}`);
        response.render('admin/index', { title: 'Test title', command_files: files, user: request.user });
    });
});

module.exports = router;