var express = require('express');
var router = express.Router();
const fs = require('fs');
var path = require('path');
const { exec } = require('child_process');
const BotRepository = require('../database/MongoDb/BotRepository');
const DiscordBotRepository = new BotRepository();

function isLoggedIn(request, response, next) {
    if (request.isAuthenticated()) {
        return next();
    } else {
        response.redirect('/login');
    }
}

router.get('/login-success', isLoggedIn, function(request, response) {
    try {
        response.render('admin/index', { user: request.user });
    } catch (error) {
        console.error(`There was an error when attempting to load the admin index file after logging in. Please inform the server administrator of this error or try again: ${error}`);
        response.status(500).json({ error: `There was an Internal Server Error when attempting to load the admin index file after logging in. Please inform the server administrator of this error or try again: ${error}` });
    }
});

router.get(['/commands', '/'], isLoggedIn, function (request, response) {
    const parent_directory_from_routes_folder = path.resolve(__dirname, '..');
    fs.readdir(path.join(parent_directory_from_routes_folder, '/commands'), (error, files) => {
        
        if (error) {
            console.error(error);
            response.status(500).json({ error: `There was an Internal Service Error when attempting to read the directory: ${error}` });
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

        try {
            response.render('admin/command_list', {
                title: `Admin dashboard`,
                message: `You have successfully logged in`,
                command_files: command_files_in_range,
                current_page_of_commands: current_page_number,
                total_command_files: files.length,
                page_numbers: page_numbers, // Include this new variable
                user: request.user
            });
        } catch (error) {
            console.error(`There was an error when attempting to load the page that shows you a paginated list of available commands for the bot. Please inform the server administrator of this error or try again: ${error}`);
            response.status(500).json({ error: `There was an Internal Service Error when attempting to render the page: ${error}` });
        }
    });
});

router.get('/commands/new', isLoggedIn, (request, response) => {
    try {
        response.render('admin/new_command', { title: 'Create new command', data:request.user });
    } catch (error) {
        console.error(`There was an error when attempting to open the page which allows you to create a new command. Please inform the server administrator of this error or try again: ${error}`);
        response.status(500).json({ error: `There was an Internal Service Error when attempting to open the page which allows you to create a new command. Please inform the server administrator of this error or try again: ${error}` });
    }
});

router.get('/commands/:file', (request, response) => {
    const file_path = request.params.file;
    const javascript_file_name = path.basename(file_path);
    const parent_directory_from_routes = path.resolve(__dirname, '..');   
    fs.readFile(path.join(parent_directory_from_routes, '/commands', javascript_file_name), 'utf-8', function (error, command_code) {
        if (error) {
            console.error(error);
            response.status(500).json({ error: `There was an Internal Server Error when attempting to read the command file. Please inform the server administrator of this error or try again: ${error}` });
            return;
        }
        try {
            response.render('admin/command', { data: request.user, file_name: javascript_file_name, command: command_code });
        } catch (error) {
            console.error(`There was an error when attempting to enter 'edit' mode for this command. Please inform the server administrator of this error or try again: ${error}`);
            response.status(500).json({ error: `There was an Internal Server Error when attempting to enter 'edit' mode for this command. Please inform the server administrator of this error or try again: ${error}` });
        }
    });
});

router.get('/discordchannelids', (request, response) => {
    try {
        response.render('admin/discord_channel_ids', { title: `Discord channel ids`, user: request.user });
    } catch (error) {
        console.error(`There was an error when attempting to retrieve the page that allows you to change the Discord channel data. Please inform the server administrator of this error: ${error}`);
        response.status(500).json({ error: `There was an Internal Server Error when attempting to retrieve the page that allows you to change the Discord channel data. Please inform the server administrator of this error: ${error}` });
    }
});

router.get('/ftpserverdata', (request, response) => {
    try {
        response.render('admin/ftp_server_data', { title: `FTP server data`, user: request.user });
    } catch (error) {
        console.error(`There was an error when attempting to retrieve the page that allows you to change the FTP server data. Please inform the server administrator of this error: ${error}`);
        response.status(500).json({ error: `There was an Internal Server Error when attempting to retrieve the page that allows you to change the FTP server data. Please inform the server administrator of this error: ${error}` });
    }
});

router.get('/newcommand', (request, response) => {
    response.render('admin/new_command', {
        title: `New package`,
        user: request.user
    });
});

router.post('/setftpserverdata', async (request, response) => {
    const ftp_server_data_object = {
        ftp_server_hostname: request.body.ftp_server_hostname_input,
        ftp_server_port: request.body.ftp_server_port_input,
        ftp_server_username: request.body.ftp_server_username_input,
        ftp_server_password: request.body.ftp_server_password_input
    }
    try {
        await DiscordBotRepository.createBotFtpServerData(1, ftp_server_data_object);
        response.render('admin/ftp_server_data', { user: request.user, info_message: `You have successfully created new FTP server credentials`, show_alert: true });
    } catch (error) {
        response.render('admin/error', { user: request.user, info_message: `There was an error when attempting to update the ftp server data in the bot database document ${error}`});
    }
});

router.post('/setdiscordchannelids', async (request, response) => {
    const discord_server_channel_ids_object = {
        discord_change_log_channel_id: request.body.bot_change_log_channel_id_input,
        discord_ingame_chat_channel_id: request.body.bot_ingame_chat_log_channel_id_input,
        discord_logins_chat_channel_id: request.body.bot_ingame_logins_channel_id_input,
        discord_new_player_chat_channel_id: request.body.bot_ingame_new_player_joined_id_input,
        discord_battlemetrics_server_id: request.body.battlemetrics_server_id_input,
        discord_server_info_button_channel_id: request.body.bot_server_info_channel_id_input
    };
    try {
        await DiscordBotRepository.createBotDiscordData(1, discord_server_channel_ids_object);
        response.render('admin/index', { user: request.user, alert_info: `Successfully changed the Discord channel ids associated with the bot`, show_alert: true });
    } catch (error) {
        console.error(`There was an error when attempting to update discord channel ids in the bot database document: ${error}`);
        response.status(500).json({ error: `An Internal Server Error occurred when attempting to update the Discord chat channel ids. Please try submitting this form again or contact the site administrator if you believe this is an error: ${error}` });
    }
});

router.post('/setgameserverdata', async (request, response) => {
    const game_server_data = {
        game_server_hostname_input: request.body.game_server_hostname_input,
        game_server_port_input: request.body.game_server_port_input
    }
    try {
        await DiscordBotRepository.createBotDiscordData(1, game_server_data);
        response.render('admin/index', { user: request.user, alert_info: `Successfully changed the game server IP address and port number`, show_alert: true})
    } catch (error) {
        console.error(`There was an error when attempting to update the game server IP address and port number: ${error}`);
        response.status(500).json({ error: `An Internal Server Error occurred when attempting to update the game server IP address and port number. Please try submitting this form again or contact the site administrator if you believe this is an error: ${error}`});
    }
});

router.post('/recompile', (request, response) => {
    const output_directory = path.join(__dirname, '..', 'executable');
    const application_name = 'scumchatmonitor';
    const build_command = `pkg . --output ${path.join(output_directory, application_name)}`;

    exec(build_command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error}`);
            return response.status(500).json({ error: `Error recompiling executable: ${error}` });
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return response.status(500).json({ error: `Error recompiling executable: ${stderr}` });
        }
        try {
            response.render('admin/index', { user: request.user, alert_info: `The application has been successfully recompiled. Please restart the application by double clicking on the .exe file`});
        } catch (error) {
            console.error(`There was an error when attempting to go to the administrator landing page after recompiling the .exe file. Please inform the server administrator of this error: ${error}`);
            response.status(500).json({ error: `There was an Internal Server Error when attempting to go to the administrator landing page after recompiling the .exe file. Please inform the server administrator of this error: ${error}` });
        }
    });
});

router.delete('/commands/delete/:file', (request, response) => {
    const file_path = request.params.file;
    const javascript_file_path = path.basename(file_path);
    const parent_directory_from_routes = path.resolve(__dirname, '..');
    const full_path = path.join(parent_directory_from_routes, '/commands', javascript_file_path);

    fs.unlink(full_path, (error) => {
        if (error) {
            console.error(`Error deleting file: ${error}`);
            return response.status(500).json({ error: `Error deleting file: ${error}` });
        }

        try {
            response.status(200).json({ message: `File ${full_path} was successfully deleted` });
        } catch (error) {
            console.error(`There was an error when attempting to delete your selected file. Please inform the server administrator of this error or try again: ${error}`);
            response.status(500).json({ error: `There was an Internal Server Error when attempting to delete your selected file. Please inform the server administrator of this error or try again: ${error}` });
        }
    });
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

    try {
        fs.writeFileSync(file_path, command_content, 'utf-8');
        response.json({ message: 'Command file created successfully' });
    } catch (error) {
        console.error(`An error occurred when attempting to write the command file: ${error}`);
        response.status(500).json({ error: `An error occurred when attempting to write the command file: ${error}` });
    }
});

router.post('/botcommand/new', isLoggedIn, async (request, response, next) => {
    const new_command_name = request.body.command_name;
    const new_command_description = request.body.command_description;
    const command_cost = request.body.command_cost_input;
    let command_items = request.body.item_input_value;

    if (!Array.isArray(command_items)) {
        command_items = [command_items];
    }
    
    new_bot_package = {
        package_name: new_command_name,
        package_description: new_command_description,
        package_cost: command_cost,
        package_items: command_items
    }

    try {
        await DiscordBotRepository.createBotItemPackage(1, new_bot_package);
        response.render('admin/new_command', { data: request.user, page_title:`Create new command`, info_message: `You have successfully created a new item package`, show_alert: true });
    } catch (error) {
        response.render('admin/error', { user: request.user, page_title:`Error`, info_message: `An error has occurred! Please inform the server administrator of this error or try creating another command: ${error}`});
    }
});

router.post('/botcommand/new', isLoggedIn, async (request, response, next) => {
    const new_command_name = request.body.command_name;
    const new_command_description = request.body.command_description;
    const command_cost = request.body.command_cost_input;
    let command_items = request.body.item_input_value;

    if (!Array.isArray(command_items)) {
        command_items = [command_items];
    }
    
    new_bot_package = {
        package_name: new_command_name,
        package_description: new_command_description,
        package_cost: command_cost,
        package_items: command_items
    }

    try {
        await DiscordBotRepository.createBotItemPackage(1, new_bot_package);
        response.render('admin/new_command', { data: request.user, page_title:`Create new command`, info_message: `You have successfully created a new item package`, show_alert: true });
    } catch (error) {
        response.render('admin/error', { user: request.user, page_title:`Error`, info_message: `An error has occurred! Please inform the server administrator of this error or try creating another command: ${error}`});
    }
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

    try {
        fs.writeFileSync(file_path, updated_file_content, 'utf-8');
        response.json({ message: 'File updated successfully' });
    } catch (error) {
        console.error(`An error occurred when attempting to update the file: ${error}`);
        response.status(500).json({ error: `An error occurred when attempting to update the file: ${error}` });
    }
});

module.exports = router;