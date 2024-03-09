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
        response.render('admin/index', { user: request.user, info_message: `There was an Internal Server Error when attempting to load the admin index file after logging in. Please inform the server administrator of this error or try again: ${error}`, show_alert: true });
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
        response.render('admin/new_command', { user: request.user, info_message: `There was an Internal Service Error when attempting to open the page which allows you to create a new command. Please inform the server administrator of this error or try again: ${error}`, show_alert: true});
    }
});

router.get('/discordchannelids', (request, response) => {
    try {
        response.render('admin/discord_channel_ids', { user: request.user, title: `Discord channel ids` });
    } catch (error) {
        console.error(`There was an error when attempting to retrieve the page that allows you to change the Discord channel data. Please inform the server administrator of this error: ${error}`);
        response.render('admin/discord_channel_ids', { user: request.user, title: `Discord channel ids`, info_message: `There was an Internal Server Error when attempting to retrieve the page that allows you to change the Discord channel data. Please inform the server administrator of this error: ${error}`, show_alert: true});
    }
});

router.get('/ftpserverdata', (request, response) => {
    try {
        response.render('admin/ftp_server_data', { user: request.user, title: `FTP server data` });
    } catch (error) {
        console.error(`There was an error when attempting to retrieve the page that allows you to change the FTP server data. Please inform the server administrator of this error: ${error}`);
        response.render('admin/ftp_server_data', { user: request.user, info_message: `There was an Internal Server Error when attempting to retrieve the page that allows you to change the FTP server data. Please inform the server administrator of this error: ${error}`, show_alert: true });
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
        response.render('admin/ftp_server_data', { user: request.user, info_message: `There was an error when attempting to update the ftp server data in the bot database document ${error}`});
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
        response.render('admin/discord_channel_ids', { user: request.user, alert_info: `An Internal Server Error occurred when attempting to update the Discord chat channel ids. Please try submitting this form again or contact the site administrator if you believe this is an error: ${error}`});
    }
});

router.post('/setgameserverdata', async (request, response) => {
    const game_server_data = {
        game_server_hostname_input: request.body.game_server_hostname_input,
        game_server_port_input: request.body.game_server_port_input
    }
    try {
        await DiscordBotRepository.createBotDiscordData(1, game_server_data);
        response.render('admin/game_server_data', { user: request.user, alert_info: `Successfully changed the game server IP address and port number`, show_alert: true})
    } catch (error) {
        console.error(`There was an error when attempting to update the game server IP address and port number: ${error}`);
        response.render('admin/game_server_data', { user: request.user, alert_info: `An Internal Server Error occurred when attempting to update the game server IP address and port number. Please try submitting this form again or contact the site administrator if you believe this is an error: ${error}`, show_alert: true})
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
            response.render('admin/index', { user: request.user, alert_info: `There was an Internal Server Error when attempting to go to the administrator landing page after recompiling the .exe file. Please inform the server administrator of this error: ${error}`, alert_info: true});
        }
    });
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
        response.render('admin/new_command', { user: request.user, page_title:`Error`, info_message: `An error has occurred! Please inform the server administrator of this error or try creating another command: ${error}`, show_alert: true});
    }
});

module.exports = router;