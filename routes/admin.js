import { Router } from 'express';
import { validatePassword } from '../modules/hashAndValidatePassword.js';
import Logger from '../utils/Logger.js';
import Cache from '../utils/Cache.js';
import BotRepository from '../database/MongoDb/BotRepository.js';
var router = Router();
const logger = new Logger();
const cache = new Cache();

function isLoggedIn(request, response, next) {
    if (request.isAuthenticated()) {
        return next();
    } else {
        response.redirect('/login');
    }
}

function checkBotRepositoryInCache(request, response, next) {
    const guildId = request.user.guild_id;
    const cacheKey = `bot_repository_${guildId}`;

    if (!cache.get(cacheKey)) {
        const botRepository = new BotRepository(guildId);
        cache.set(cacheKey, botRepository);
    } 
    request.user.bot_repository = cache.get(cacheKey);
    next();
}

router.post('/logdata', async function(request, response) {
    const { log_type, message, guild_id, file_type } = request.body;

    try {
        await logger.writeLogToAzureContainer(
            `${log_type}`,
            `${message}`,
            `${guild_id}`,
            `${guild_id}-${file_type}`
        );
        response.status(200).json({ success: true, message: `The log data has been written to the specified log file successfully`});
    } catch (error) {
        response.status(500).json({ success: false, message: `Failed to write data to the specified log file: ${error}`});
    }
});

router.post('/createwebsocket', async function(request, response) {
    const { email, password } = request.body;
    const botRepository = request.user.bot_repository;

    try {
        const repository_user = await botRepository.getBotDataByEmail(email);

        if (repository_user) {
            const user_password = repository_user.bot_password;
            const user_salt = repository_user.bot_salt;
            const is_valid_account = validatePassword(password, user_password, user_salt);
            
            if (is_valid_account) {
                const user_id = repository_user.guild_id;
                response.json({ success: true, message: `Login successful`, bot_id: user_id});
            } else {
                response.status(401).json({ success: false, message: `Invalid credentials` });
            }
        } else {
            response.status(401).json({ success: false, message: `Invalid credentials` });
        }
    } catch (error) {
        console.error(`Login error: ${error}`);
        response.status(500).json({success: false, message: "An error occurred during login."})
    }
});

router.get('/newcommand', isLoggedIn, function(request, response) {
    try {
        response.render('admin/new_command', { user: request.user, title: `New bot package` });
    } catch (error) {
        console.error(`There was an error when attempting to load the admin new command page. Please inform the server administrator of this error or try again: ${error}`);
        response.render('admin/new_command', { user: request.user, title: `New bot package` });
    }
});

router.get('/command/:commandname', isLoggedIn, async (request, response) => {
    const package_name = request.params.commandname;
    const botRepository = request.user.bot_repository;

    try {
        const package_data = await botRepository.getBotPackageFromName(package_name); 

        response.render('admin/command', { user: request.user, package: package_data, title: `${package_name}` });
        
    } catch (error) {
        console.error(`Error fetching command data: ${error}`);
        response.render('admin/command', { user: request.user, title: `${package_name}`});
    }
});


router.get(['/login-success', '/'], isLoggedIn, function(request, response) {
    try {
        response.render('admin/index', { user: request.user, currentPage: '/admin/', title: `Admin dashboard` });
    } catch (error) {
        console.error(`There was an error when attempting to load the admin index file after logging in. Please inform the server administrator of this error or try again: ${error}`);
        response.render('admin/index', { user: request.user, currentPage: '/admin/', title: `Admin dashboard` });
    }
});

router.get(['/commands'], isLoggedIn, checkBotRepositoryInCache, async (request, response) => {
    let bot_packages;
    const botRepository = request.user.bot_repository;
    
    try {
        bot_packages = await botRepository.getBotItemPackagesData();
    } catch (error) {
        console.error(`There was an internal service error when attempting to read all the command data from MongoDB: ${error}`);
        response.status(500).json({ error: `There was an internal service error when attempting to read all the command data from MongoDB: ${error}`});
    }

    if (bot_packages) {
        const commands_per_page = 10;

        const range = request.query.range || '1&10';
        /*
        Destructure the above query range string to retrieve the numbers. In this instance, we would get numbers 1 and 10
        */
        // Split the 'range' query parameter by '&' and convert both parts to numbers
        // This will determine the range of commands to display on the current page
        const [start_range_number, end_range_number] = range.split('&').map(Number);

        // Calculate the current page number based on the start range and the number of commands per page
        const current_page_number = Math.ceil(start_range_number / commands_per_page);

        // Calculate the total number of pages needed to display all bot packages
        const total_number_of_pages = Math.ceil(bot_packages.length / commands_per_page);

        // Set the number of pages to be visible in the pagination at any given time
        const visible_pages = 3;

        // Calculate the starting page number for pagination. Ensures it doesn't go below 1.
        let start_page = Math.max(1, current_page_number - Math.floor(visible_pages / 2));

        // Calculate the ending page number for pagination. Ensures it doesn't go beyond the total number of pages.
        let end_page = Math.min(total_number_of_pages, start_page + visible_pages - 1);

        // Adjust the start page based on the end page to ensure the correct number of visible pages are shown.
        // This is particularly important when navigating to the last few pages.
        start_page = Math.max(1, end_page - visible_pages + 1); 

        // Generate the list of page numbers to be displayed in the pagination based on the start and end pages calculated.
        const page_numbers = Array.from({ length: (end_page - start_page) + 1 }, (_, i) => i + start_page);

        // Slice the bot_packages array to only include the packages for the current page based on the range selected.
        const current_page_packages = bot_packages.slice(start_range_number - 1, end_range_number);

        // Map the current page's packages to their package names to be displayed as command files.
        const commands = current_page_packages;

        response.render('admin/command_list', {
            title: 'Bot commands', 
            commands, 
            current_page_of_commands: current_page_number, 
            total_command_files: bot_packages.length, 
            page_numbers,
            user: request.user,
            currentPage: '/admin/command_list'
        });
    } else {
        response.render('admin/command_list', {
            title: 'Bot commands', 
            user: request.user,
            currentPage: '/admin/command_list'
        });
    }
});
// getAllBotData
router.get('/discordchannelids', isLoggedIn, checkBotRepositoryInCache, async (request, response) => {
    try {
        response.render('admin/discord_channel_ids', { user: request.user, title: `Discord channel ids`, currentPage: '/admin/discordchannelids', title:`Discord channel ids` });
    } catch (error) {
        console.error(`There was an error when attempting to retrieve the page that allows you to change the Discord channel data. Please inform the server administrator of this error: ${error}`);
        response.render('admin/discord_channel_ids', { user: request.user, title: `Discord channel ids`, title:`Discord channel ids` });
    }
});

router.get('/ftpserverdata', isLoggedIn, checkBotRepositoryInCache, async (request, response) => {
    try {
        response.render('admin/ftp_server_data', { user: request.user, title: `FTP server data`, currentPage: '/admin/ftpserverdata'});
    } catch (error) {
        console.error(`There was an error when attempting to retrieve the page that allows you to change the FTP server data. Please inform the server administrator of this error: ${error}`);
        response.render('admin/ftp_server_data', { user: request.user, title: `FTP server data` });
    }
});

router.get('/gameserverdata', (request, response) => {
    try {
        response.render('admin/game_server_data', { user: request.user, currentPage: '/admin/gameserverdata', title: `Game server data` });
    } catch (error) {
        console.error(`There was an error when attempting to retrieve the page that allows you to set game server data`);
        response.render('admin/game_server_data', { user: request.user, info_message: `There was an error`, title: `Game server data` });
    }
});

router.get('/spawncoordinates', (request, response) => {
    try {
        response.render('admin/new_player_join_coordinates', { user: request.user, currentPage: '/admin/spawncoordinates', title: `Spawn zone coordinates`});
    } catch (error) {
        console.error(`There was an error when attempting to retrieve the page that allows you to set the spawn location of players. Please inform the server administrator of this error: ${error}`);
        response.render('admin/new_player_join_coordinates', { user: request.user, currentPage: `/admin/spawncoordinates`, title: `Spawn zone coordinates`});
    }
});

router.get('/logfiles', async (request, response) => {
    const user_guild_id = request.user.guild_id;
    const info_log_files_blob = await logger.readAllLogsFromAzureContainer(`${user_guild_id}-info-logs`);
    const error_log_files_blob = await logger.readAllLogsFromAzureContainer(`${user_guild_id}-error-logs`);
    const chat_log_files_blob = await logger.readAllLogsFromAzureContainer(`${user_guild_id}-chat-logs`);
    const logins_log_files_blob = await logger.readAllLogsFromAzureContainer(`${user_guild_id}-login-logs`);
    try {
        response.render('admin/logs_page', { user: request.user, info_log_files: info_log_files_blob, error_log_files: error_log_files_blob, chat_log_files: chat_log_files_blob, login_and_logout_log_files: logins_log_files_blob, currentPage: '/admin/logfiles', title: `Log files`});
    } catch (error) {
        console.error(`There was an error when attempting to retrieve the page that allows you to view your log files. Please inform the server administrator of this error: ${error}`);
        response.render('admin/logs_page', { user: request.user, currentPage: `/admin/logfiles`, title: `Log files`});
    }
}); 

router.post('/setftpserverdata', async (request, response) => {
    const request_user_id = request.user.guild_id;
    const botRepository = request.user.bot_repository;

    const ftp_server_data_object = {
        guild_id: request_user_id,
        ftp_server_hostname: request.body.ftp_server_hostname_input,
        ftp_server_port: request.body.ftp_server_port_input,
        ftp_server_username: request.body.ftp_server_username_input,
        ftp_server_password: request.body.ftp_server_password_input
    }
    try {
        await botRepository.createBotFtpServerData(ftp_server_data_object);
        response.render('admin/ftp_server_data', { user: request.user, alert_title: `Successfully updated FTP server credentials`, alert_description: `You have successfully updated your FTP server credentials`, show_submit_modal: true });
    } catch (error) {
        response.render('admin/ftp_server_data', { user: request.user, alert_title: `Error updating FTP server credentials`, alert_description: `Please try submitting this form again or contacting the site administrator if you believe this is an error: ${error}`, show_error_modal: true });
    }
});

router.post('/setspawncoordinates', async (request, response) => {
    const request_user_id = request.user.guild_id;
    const botRepository = request.user.bot_repository;

    const coordinates_object = {
        guild_id: request_user_id,
        prefix: "#Teleport",
        x: request.body.x_coordinate_data_input,
        y: request.body.y_coordinate_data_input,
        z: request.body.z_coordinate_input
    }
    try {
        await botRepository.createBotTeleportNewPlayerCoordinates(coordinates_object);
        response.render('admin/new_player_join_coordinates', { user: request.user, alert_title: `Successfully updated spawn zone coordinates`, alert_description: `You have successfully changed the coordinates for the new player spawn zone`, show_submit_modal: true });
    } catch (error) {
        response.render('admin/new_player_join_coordinates', { user: request.user, alert_info: `Error updating spawn zone coordinates`, alert_description: `Please try submitting this form again or contacting the site administrator if you believe this is an error: ${error}`, show_error_modal: true });
    }
});

router.post('/setdiscordchannelids', async (request, response) => {
    const request_user_id = request.user.guild_id;
    const botRepository = request.user.bot_repository;

    const discord_server_channel_ids_object = {
        guild_id: request_user_id,
        discord_ingame_chat_channel_id: request.body.bot_ingame_chat_log_channel_id_input,
        discord_logins_chat_channel_id: request.body.bot_ingame_logins_channel_id_input,
        discord_new_player_chat_channel_id: request.body.bot_ingame_new_player_joined_id_input,
        discord_battlemetrics_server_id: request.body.battlemetrics_server_id_input,
        discord_server_info_button_channel_id: request.body.bot_server_info_channel_id_input
    };
    try {
        await botRepository.createBotDiscordData(discord_server_channel_ids_object);
        response.render('admin/discord_channel_ids', { user: request.user, alert_title: `Successfully changed Discord channel ids`, alert_description: `You have successfully changed the Discord channel ids associated with the bot`, show_submit_modal: true });
    } catch (error) {
        console.error(`There was an error when attempting to update discord channel ids in the bot database document: ${error}`);
        response.render('admin/discord_channel_ids', { user: request.user, alert_title: `Error changing Discord channel ids`, alert_description: `Please try submitting this form again or contact the site administrator if you believe this is an error: ${error}`, show_error_modal: true});
    }
});

router.post('/setgameserverdata', async (request, response) => {
    const request_user_id = request.user.guild_id;
    const botRepository = request.user.bot_repository;

    const game_server_data = {
        guild_id: request_user_id,
        game_server_hostname_input: request.body.game_server_hostname_input,
        game_server_port_input: request.body.game_server_port_input
    }
    try {
        await botRepository.createBotGameServerData(game_server_data);
        response.render('admin/game_server_data', { user: request.user, alert_title: `Successfully submitted changes`, alert_description: `You have successfully changed the game server IPv4 address and port number`, show_submit_modal: true})
    } catch (error) {
        console.error(`There was an error when attempting to update the game server IP address and port number: ${error}`);
        response.render('admin/game_server_data', { user: request.user, alert_title: `Error submitting changes`, alert_description: `Please try submitting this form again or contact the server administrator if you believe this is an error: ${error}`, show_error_modal: true})
    }
});

router.post('/botcommand/new', isLoggedIn, async (request, response, next) => {
    const new_command_name = request.body.command_name;
    const new_command_description = request.body.command_description;
    const command_cost = request.body.command_cost_input;
    let command_items = request.body.item_input_value;
    const botRepository = request.user.bot_repository;

    if (!Array.isArray(command_items)) {
        command_items = [command_items];
    }
    
    const new_bot_package = {
        package_name: new_command_name,
        package_description: new_command_description,
        package_cost: command_cost,
        package_items: command_items
    }

    try {
        await botRepository.createBotItemPackage(1, new_bot_package);
        response.render('admin/new_command', { user: request.user, page_title:`Create new command`, alert_title: `Successfuly created new package`, alert_description: `You have successfully created a new item package and registered it with your bot`, show_submit_modal: true });
    } catch (error) {
        response.render('admin/new_command', { user: request.user, page_title:`Error`, alert_title: `Error creating new package`, alert_description: `Please try submitting this form again or contact the server administrator if you believe this is an error: ${error}`, show_error_modal: true});
    }
});

export default router;