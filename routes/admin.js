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

router.get(['/login-success','/commands', '/'], isLoggedIn, function (request, response) {
    const parent_directory_from_routes_folder = path.resolve(__dirname, '..');
    fs.readdir(path.join(parent_directory_from_routes_folder, '/commands'), (error, files) => {
        
        if (error) {
            console.error(error);
            return;
        };

        const command_buttons_per_page = 10;
        // Assuming 'range' is your query parameter in the format 'start&end'
        const range = request.query.range || '1&10';
        const [start_range_number, end_range_number] = range.split('&').map(Number);

        // Calculate the current page number based on the starting range
        const current_page_number = Math.ceil(start_range_number / command_buttons_per_page);

        // Calculate the total number of pages
        const total_number_of_pages = Math.ceil(files.length / command_buttons_per_page);

        // Calculate the dynamic range of page numbers for pagination
        const visible_pages = 3; // Adjust the number of visible pages in the pagination
        let start_page = Math.max(1, current_page_number - Math.floor(visible_pages / 2));
        let end_page = Math.min(total_number_of_pages, start_page + visible_pages - 1);
        start_page = Math.max(1, end_page - visible_pages + 1); // Adjust start page if end page is at the limit

        const page_numbers = Array.from(
            { length: (end_page - start_page) + 1 }, 
            (_, i) => start_page + i);

        // Slice the 'files' array to get the files for the current page
        const command_files_in_range = files.slice(start_range_number - 1, end_range_number);

        response.render('admin/index', {
            title: `Admin dashboard`,
            message: `You have successfully logged in`,
            command_files: command_files_in_range,
            current_page_of_commands: current_page_number,
            total_command_files: files.length,
            page_numbers: page_numbers, // Include this new variable
            user: request.user
        });
    });
});

router.get('/commands/new', isLoggedIn, (request, response) => {
    response.render('admin/new_command', { title: 'Create new command', data:request.user });
});

router.get('/commands/:file', (request, response) => {
    const file_path = request.params.file;
    const javascript_file_name = path.basename(file_path);
    const parent_directory_from_routes = path.resolve(__dirname, '..');   
    fs.readFile(path.join(parent_directory_from_routes, '/commands', javascript_file_name), 'utf-8', function (error, command_code) {
        if (error) {
            console.error(error);
            return;
        }
        response.render('admin/command', { data: request.user, file_name: javascript_file_name });
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
    const new_command_name = request.body.command_name;
    const new_command_description = request.body.command_description;
    const command_cost = request.body.command_cost_input;
    const command_items = request.body.item_input_value;
    const placeholder = 1;  
    let command_data_string = "";

    if (!Array.isArray(command_items)) {
        command_data_string = `"${command_items} 1 Location ${placeholder}"`;
    } else {
        command_data_string = command_items.map(item => `"${item} 1 Location ${placeholder}"`).join(', ');
    }

    const command_content = `
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = function (user_account) {
    const object = {
        data: new SlashCommandBuilder()
            .setName('${new_command_name}')
            .setDescription('${new_command_description}'),
        command_data: ['{user_steam_name} your package has been dispatched', ${command_data_string}],
        authorization_role_name: [],
        command_cost: ${command_cost},

        async execute(interaction) {
            this.replaceCommandDataLocation(user_account.user_steam_id);
            await interaction.reply("Please log into TheTrueCastaways SCUM server and type the command '/${new_command_name}' into local or global chat");
        },

        replaceCommandUserSteamName() {
            this.command_data = this.command_data.map(command_string => {
                return command_string.replace('{user_steam_name}', user_steam_name);
            });
        },

        replaceCommandItemSpawnLocation() {
            this.command_data = this.command_data.map(command_string => {
                return command_string.replace('Location 1', 'Location ' + user_account.user_steam_id);
            })
        }
    }
    return object;
}`;

    // Write the content to the command file
    const parent_directory_from_routes = path.resolve(__dirname, '..');
    const file_path = path.join(parent_directory_from_routes, '/commands', new_command_name + '.js');
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

module.exports = router;