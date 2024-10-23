import {Router} from 'express';
import {validatePassword} from '../modules/hashAndValidatePassword.js';
import Logger from '../utils/Logger.js';
import Cache from '../utils/Cache.js';
import {body, validationResult} from 'express-validator';
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

router.post('/createwebsocket', 
    body('email')
    .isEmail()
    .withMessage(`Please enter a valid email address`),

    body('password')
    .isLength({ min: 1, max: 32})
    .trim()
    .withMessage(`The password field cannot be empty`),

    async function(request, response) {

    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        request.session.alert_title = 'Validation errors';
        request.session.alert_description = '<ul id="error_message_list">' + errors.array().map(error => `<li>${error.msg}</li>`).join('') + '</ul>';
        request.session.show_error_modal = true;
        return response.redirect('/login');
    }

    const { email, password } = request.body;
    const botRepository = new BotRepository();

    try {
        const repository_user = await botRepository.getBotUserByEmail(email);

        if (repository_user) {
            const user_password = repository_user.bot_password;
            const user_salt = repository_user.bot_salt;
            const is_valid_account = validatePassword(password, user_password, user_salt);
            
            if (is_valid_account) {
                const user_id = repository_user.guild_id;
                return response.json({ success: true, message: `Login successful`, bot_id: user_id});
            } else {
                return response.status(401).json({ success: false, message: `Invalid credentials` });
            }
        } else {
            return response.status(401).json({ success: false, message: `Invalid credentials` });
        }
    } catch (error) {
        return response.status(500).json({success: false, message: "An error occurred during login", error: `${error}`});
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

router.get('/command/:commandname', isLoggedIn, checkBotRepositoryInCache, async (request, response) => {
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

        bot_packages.sort((a, b) => a.package_name.localeCompare(b.package_name));

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
            title: 'Commands',
            commands, 
            current_page_of_commands: current_page_number, 
            total_command_files: bot_packages.length, 
            page_numbers,
            user: request.user,
            currentPage: '/admin/command_list'
        });
    } else {
        response.render('admin/command_list', {
            title: 'Commands',
            user: request.user,
            currentPage: '/admin/command_list'
        });
    }
});

router.get(['/teleportcommands'], isLoggedIn, checkBotRepositoryInCache, async (request, response) => {
    let bot_teleport_commands;
    const botRepository = request.user.bot_repository;

    try {
        bot_teleport_commands = await botRepository.getAllBotTeleportCommands();
    } catch (error) {
        console.error(`There was an internal service error when attempting to read all the command data from MongoDB: ${error}`);
        response.status(500).json({ error: `There was an internal service error when attempting to read all the command data from MongoDB: ${error}`});
    }

    if (bot_teleport_commands) {
        const commands_per_page = 10;

        bot_teleport_commands.sort((a, b) => a.package_name.localeCompare(b.package_name));

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
        const total_number_of_pages = Math.ceil(bot_teleport_commands.length / commands_per_page);

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
        // Map the current page's packages to their package names to be displayed as command files.
        const teleport_commands = bot_teleport_commands.slice(start_range_number - 1, end_range_number);

        response.render('admin/teleport_command_list', {
            title: 'Teleport commands',
            teleport_commands,
            current_page_of_commands: current_page_number,
            total_command_files: teleport_commands.length,
            page_numbers,
            user: request.user,
            currentPage: '/admin/teleport_command_list'
        });
    } else {
        response.render('admin/teleport_command_list', {
            title: 'Teleport commands',
            user: request.user,
            currentPage: '/admin/teleport_command_list'
        });
    }
});

router.get('/players', isLoggedIn, checkBotRepositoryInCache, async (request, response) => {
    let server_players = undefined;
    const botRepository = request.user.bot_repository;
    const players_deleted_count = request.query.deleted;
    const operation_success = request.query.success;

    try {
        server_players = await botRepository.findAllUsers();
    } catch (error) {
        console.error(`There was an internal service error when attempting to read all the player data from MongoDB: ${error}`);
        response.status(500).json({error: `There was an internal service error when attempting to read all the player data from MongoDB: ${error}`});
        return;
    }

    if (server_players) {
        const players_per_page = 10;

        const range = request.query.range || '1&10';

        const [start_range_number, end_range_number] = range.split('&').map(Number);

        // Calculate the current page number
        const current_page_number = Math.ceil(start_range_number / players_per_page);

        // Calculate the total number of pages
        const total_number_of_pages = Math.ceil(server_players.length / players_per_page);

        const visible_players_per_page = 3;

        let start_page = Math.max(1, current_page_number - Math.floor(visible_players_per_page / 2));

        let end_page = Math.min(total_number_of_pages, start_page + visible_players_per_page - 1);

        start_page = Math.max(1, end_page - visible_players_per_page + 1);

        // Generate the list of page numbers to be displayed in the pagination
        const page_numbers = Array.from({length: (end_page - start_page) + 1}, (_, i) => i + start_page);

        // Slice the players array to only include the players for the current page
        const current_page_players = server_players.slice(start_range_number - 1, end_range_number);

        if (typeof operation_success === 'undefined') {
            response.render('admin/serverPlayers', {
                title: 'Players',
                user: request.user,
                currentPage: '/admin/serverPlayers',
                server_players,
                current_page_players,
                current_page_of_players: current_page_number,
                total_player_files: server_players.length,
                page_numbers,
                submit_modal_title: `Delete player from bot`,
                submit_modal_description: `Are you sure you want to delete the selected player(s)? If they are deleted, they will no longer be able to 
                communicate with the bot because they are no longer going to be registered`,
                cancel_modal_title: `Go to previous page`,
                cancel_modal_description: `Are you sure you want to go back to the previous page?`,
            });
        }

        // Second case: if operation_success is true, show success modal
        else if (operation_success === 'true') {
            response.render('admin/serverPlayers', {
                title: 'Players',
                server_players,
                current_page_players,
                current_page_of_players: current_page_number,
                total_player_files: server_players.length,
                page_numbers,
                user: request.user,
                submit_modal_title: `Delete player from bot`,
                submit_modal_description: `Are you sure you want to delete the selected player(s)? If they are deleted, they will no longer be able to 
                communicate with the bot because they are no longer going to be registered`,
                cancel_modal_title: `Go to previous page?`,
                cancel_modal_description: `Are you sure you want to go back to the previous page?`,
                currentPage: '/admin/serverPlayers',
                show_submit_modal: true,
                alert_title: `Deletion success`,
                alert_description: `Successfully deleted ${players_deleted_count} players`
            });
        }

        // Third case: if operation_success is false, show error modal
        else if (operation_success === 'false') {
            console.log(operation_success);
            response.render('admin/serverPlayers', {
                title: 'Players',
                server_players,
                current_page_players,
                current_page_of_players: current_page_number,
                total_player_files: server_players.length,
                page_numbers,
                user: request.user,
                submit_modal_title: `Delete player from bot`,
                submit_modal_description: `Are you sure you want to delete the selected player(s)? If they are deleted, they will no longer be able to 
                communicate with the bot because they are no longer going to be registered`,
                cancel_modal_title: `Go to previous page?`,
                cancel_modal_description: `Are you sure you want to go back to the previous page?`,
                show_error_modal: true,
                alert_title: `Deletion failure`,
                alert_description: `There was an error when attempting to delete the selected players(s). Please try again`,
                currentPage: '/admin/serverPlayers'
            });
        }
    }
});


router.get("/player/:steam_id", isLoggedIn, checkBotRepositoryInCache, async function(request, response) {
    const steam_id = request.params.steam_id;
    const botRepository = request.user.bot_repository;
    let player = undefined;

    try {
        player = await botRepository.findUserById(steam_id);
    } catch (error) {
        console.error(`There was an internal service error when attempting to read the player data from MongoDB: ${error}`);
        return;
    }

    if (player) {
        response.render('admin/serverPlayer', {
            title: `Player details`,
            player,
            user: request.user,
            currentPage: `/players/${steam_id}`
        });
    } else {
        response.status(404).render('error', {
            message: `The player you wish to see was not found`,
            error: { status: 404 }
        });
    }
});

router.get('/discordchannelids', isLoggedIn, async (request, response) => {
    try {
        const show_submit_modal = request.session.show_submit_modal || false;
        const show_error_modal = request.session.show_error_modal || false;
        const alert_title = request.session.alert_title || '';
        const alert_description = request.session.alert_description || '';

        // Clear the session variables
        request.session.show_submit_modal = false;
        request.session.show_error_modal = false;
        request.session.alert_title = '';
        request.session.alert_description = '';

        response.render('admin/discord_channel_ids', {
            user: request.user,
            title: `Discord channel ids`,
            currentPage: '/admin/discordchannelids',
            submit_modal_title: `Change Discord channel ids`,
            submit_modal_description: `Are you sure you want to change the Discord channel id values?`,
            cancel_modal_title: `Cancel changes?`,
            cancel_modal_description: `Are you sure you want to go back to the previous page?`,
            show_submit_modal,
            show_error_modal,
            alert_title,
            alert_description
        });
    } catch (error) {
        console.error(`There was an error when attempting to retrieve the page that allows you to change the Discord channel data. Please inform the server administrator of this error: ${error}`);
        response.render('admin/discord_channel_ids', { 
            user: request.user, 
            title: `Discord channel ids`
        });
    }
});

router.get('/ftpserverdata', isLoggedIn, async (request, response) => {
    try {
        const show_submit_modal = request.session.show_submit_modal || false;
        const show_error_modal = request.session.show_error_modal || false;
        const alert_title = request.session.alert_title || '';
        const alert_description = request.session.alert_description || '';

        // Clear the session variables
        request.session.show_submit_modal = false;
        request.session.show_error_modal = false;
        request.session.alert_title = '';
        request.session.alert_description = '';

        response.render('admin/ftp_server_data', {
            user: request.user,
            title: `FTP server data`,
            currentPage: '/admin/ftpserverdata',
            submit_modal_title: `Change FTP server data`,
            submit_modal_description: `Are you sure you want to change the FTP server data?`,
            cancel_modal_title: `Cancel changes?`,
            cancel_modal_description: `Are you sure you want to go back to the previous page?`,
            show_submit_modal,
            show_error_modal,
            alert_title,
            alert_description
        });
    } catch (error) {
        console.error(`There was an error when attempting to retrieve the page that allows you to change the FTP server data. Please inform the server administrator of this error: ${error}`);
        response.render('admin/ftp_server_data', { 
            user: request.user, 
            title: `FTP server data` 
        });
    }
});


router.get('/gameserverdata', isLoggedIn, (request, response) => {
    try {
        const show_submit_modal = request.session.show_submit_modal || false;
        const show_error_modal = request.session.show_error_modal || false;
        const alert_title = request.session.alert_title || '';
        const alert_description = request.session.alert_description || '';

        // Clear the session variables
        request.session.show_submit_modal = false;
        request.session.show_error_modal = false;
        request.session.alert_title = '';
        request.session.alert_description = '';

        response.render('admin/game_server_data', {
            user: request.user,
            currentPage: '/admin/gameserverdata',
            title: `Game server data`,
            submit_modal_title: `Change SCUM server data`,
            submit_modal_description: `Are you sure you want to change your SCUM server IPv4 address and port number?`,
            cancel_modal_title: `Cancel changes?`,
            cancel_modal_description: `Are you sure you want to go back to the previous page?`,
            show_submit_modal,
            show_error_modal,
            alert_title,
            alert_description
        });
    } catch (error) {
        console.error(`There was an error when attempting to retrieve the page that allows you to set game server data: ${error}`);
        response.render('admin/game_server_data', { 
            user: request.user, 
            title: `Game server data`,
            info_message: `There was an error`
        });
    }
});


router.get('/spawncoordinates', isLoggedIn, (request, response) => {
    try {
        const show_submit_modal = request.session.show_submit_modal || false;
        const show_error_modal = request.session.show_error_modal || false;
        const alert_title = request.session.alert_title || '';
        const alert_description = request.session.alert_description || '';

        // Clear the session variables
        request.session.show_submit_modal = false;
        request.session.show_error_modal = false;
        request.session.alert_title = '';
        request.session.alert_description = '';

        response.render('admin/new_player_join_coordinates', {
            user: request.user,
            currentPage: '/admin/spawncoordinates',
            title: `Spawn zone coordinates`,
            submit_modal_title: `Change spawn zone coordinates`,
            submit_modal_description: `Are you sure you want to change new player spawn zone coordinates?`,
            cancel_modal_title: `Cancel changes?`,
            cancel_modal_description: `Are you sure you want to go back to the previous page?`,
            show_submit_modal,
            show_error_modal,
            alert_title,
            alert_description
        });
    } catch (error) {
        console.error(`There was an error when attempting to retrieve the page that allows you to set the spawn location of players. Please inform the server administrator of this error: ${error}`);
        response.render('admin/new_player_join_coordinates', { 
            user: request.user, 
            currentPage: '/admin/spawncoordinates', 
            title: `Spawn zone coordinates` 
        });
    }
});


router.get('/logfiles', isLoggedIn, async (request, response) => {
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

router.post('/setftpserverdata', isLoggedIn, checkBotRepositoryInCache, 
    body('ftp_server_hostname_input')
    .isString()
    .trim()
    .notEmpty()
    .matches("^(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)){3}$")
    .withMessage('The FTP server hostname field must contain a valid IPv4 address (between 0.0.0.0 and 255.255.255.255'),

    body('ftp_server_port_input')
    .isInt()
    .trim()
    .notEmpty()
    .matches("^(102[4-9]|10[3-9][0-9]|1[1-9][0-9]{2}|[2-9][0-9]{3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$")
    .withMessage('The FTP server port number must contain a number between 1000 and 65535'),

    body('ftp_server_username_input')
    .isString()
    .trim()
    .notEmpty()
    .matches("^[a-zA-Z0-9_]*$")
    .withMessage('The FTP server username must contain a string of characters'),

    body('ftp_server_password_input')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('The FTP server password must contain a string of characters'),
    
    async (request, response) => {

    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        request.session.alert_title = 'Validation errors';
        request.session.alert_description = '<ul id="error_message_list">' + errors.array().map(error => `<li>${error.msg}</li>`).join('') + '</ul>';
        request.session.show_error_modal = true;
        return response.redirect('/admin/ftpserverdata');
    }

    const request_user_id = request.user.guild_id;
    const botRepository = request.user.bot_repository;

    const ftp_server_data_object = {
        guild_id: request_user_id,
        ftp_server_hostname: request.body.ftp_server_hostname_input,
        ftp_server_port: request.body.ftp_server_port_input,
        ftp_server_username: request.body.ftp_server_username_input,
        ftp_server_password: request.body.ftp_server_password_input
    };
    try {
        await botRepository.createBotFtpServerData(ftp_server_data_object);
        // Store the success message in the session
        request.session.alert_title = 'Successfully updated FTP server credentials';
        request.session.alert_description = 'You have successfully updated your FTP server credentials';
        request.session.show_submit_modal = true;
        response.redirect('/admin/ftpserverdata');
    } catch (error) {
        // Store the error message in the session
        request.session.alert_title = 'Error updating FTP server credentials';
        request.session.alert_description = `Please try submitting this form again or contact the site administrator if you believe this is an error: ${error}`;
        request.session.show_error_modal = true;
        response.redirect('/admin/ftpserverdata');
    }
});

router.post("/deleteusers", isLoggedIn, checkBotRepositoryInCache, async function(request, response) {
    /**
     * user_steam_ids_to_delete will be an array of steam ids
     */
    let operation_success = true;
    let user_steam_ids_to_delete = request.body.user_ids_checkbox;
    const botRepository = request.user.bot_repository;

    if (!(user_steam_ids_to_delete)) {
        response.redirect('/admin/players');
    }

    if (!Array.isArray(user_steam_ids_to_delete)) {
        user_steam_ids_to_delete = [user_steam_ids_to_delete];
    }

    let user_count_deleted = 0;

    try {
        for (let i = 0; i < user_steam_ids_to_delete.length; i++) {
            let user_deleted = await botRepository.deleteUser(user_steam_ids_to_delete[i]);

            if (user_deleted) {
                user_count_deleted++;
            } else {
                operation_success = false;
            }
        }
        response.redirect(`/admin/players?deleted=${user_count_deleted}&success=${operation_success}`);
    } catch (error) {
        response.redirect('/admin/players?deleted=0&success=false');
    }
});

router.post('/setspawncoordinates', isLoggedIn, checkBotRepositoryInCache,   
    body('x_coordinate_data_input')
    .trim()
    .isNumeric()
    .withMessage('The spawn zone x coordinate must be a number'),

    body('y_coordinate_data_input')
    .trim()
    .isNumeric()
    .withMessage('The spawn zone y coordinate must be a number'),

    body('z_coordinate_input')
    .trim()
    .isNumeric()
    .withMessage('The spawn zone z coordinate must be a number'),
    
    async (request, response) => {

    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        request.session.alert_title = 'Validation errors';
        request.session.alert_description = '<ul id="error_message_list">' + errors.array().map(error => `<li>${error.msg}</li>`).join('') + '</ul>';
        request.session.show_error_modal = true;
        return response.redirect('/admin/spawncoordinates');
    }
    const request_user_id = request.user.guild_id;
    const botRepository = request.user.bot_repository;

    const coordinates_object = {
        guild_id: request_user_id,
        command_prefix: "#Teleport",
        x_coordinate: request.body.x_coordinate_data_input,
        y_coordinate: request.body.y_coordinate_data_input,
        z_coordinate: request.body.z_coordinate_input
    };
    try {
        await botRepository.createBotTeleportNewPlayerCoordinates(coordinates_object);
        // Store the success message in the session
        request.session.alert_title = 'Successfully updated spawn zone coordinates';
        request.session.alert_description = 'You have successfully changed the coordinates for the new player spawn zone';
        request.session.show_submit_modal = true;
        response.redirect('/admin/spawncoordinates');
    } catch (error) {
        console.error(`There was an error when attempting to update the spawn zone coordinates: ${error}`);
        // Store the error message in the session
        request.session.alert_title = 'Error updating spawn zone coordinates';
        request.session.alert_description = `Please try submitting this form again or contact the site administrator if you believe this is an error: ${error}`;
        request.session.show_error_modal = true;
        response.redirect('/admin/spawncoordinates');
    }
});


router.post('/setdiscordchannelids', isLoggedIn, checkBotRepositoryInCache, 
    body('bot_ingame_chat_log_channel_id_input')
    .isString()
    .trim()
    .isNumeric()
    .matches("^[0-9]{17,25}$")
    .withMessage('The In-game discord channel id must consist of between 17 and 25 numbers between 0 and 9'),

    body('bot_ingame_logins_channel_id_input')
    .isString()
    .trim()
    .isNumeric()
    .matches("^[0-9]{17,25}$")
    .withMessage('The player login channel id must consist of between 17 and 25 numbers between 0 and 9'),
    
    body('bot_ingame_new_player_joined_id_input')
    .isString()
    .trim()
    .isNumeric()
    .matches("^[0-9]{17,25}$")
    .withMessage('The new player joins channel id must consist of between 17 and 25 numbers between 0 and 9'),

    body('battlemetrics_server_id_input')
    .isString()
    .trim()
    .isNumeric()
    .matches("^[0-9]{17,25}$")
    .withMessage('Your Battlemetrics server id must consist of between 17 and 25 numbers between 0 and 9'),

    body('bot_server_info_channel_id_input')
    .isString()
    .trim()
    .isNumeric()
    .matches("^[0-9]{17,25}$")
    .withMessage('The server info button channel id must consist of between 17 and 25 numbers between 0 and 9'),
    
    async (request, response) => {

    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        request.session.alert_title = 'Validation errors';
        request.session.alert_description = '<ul id="error_message_list">' + errors.array().map(error => `<li>${error.msg}</li>`).join('') + '</ul>';
        request.session.show_error_modal = true;
        return response.redirect('/admin/discordchannelids');
    }

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
        request.session.alert_title = 'Successfully changed Discord channel ids';
        request.session.alert_description = 'You have successfully changed the Discord channel ids associated with the bot';
        request.session.show_submit_modal = true;
        response.redirect('/admin/discordchannelids');
    } catch (error) {
        console.error(`There was an error when attempting to update discord channel ids in the bot database document: ${error}`);
        request.session.alert_title = 'Error changing Discord channel ids';
        request.session.alert_description = `Please try submitting this form again or contact the site administrator if you believe this is an error: ${error}`;
        request.session.show_error_modal = true;
        response.redirect('/admin/discordchannelids');
    }
});

router.post('/setgameserverdata', isLoggedIn, checkBotRepositoryInCache, 
    body('game_server_hostname_input')
    .isString()
    .trim()
    .notEmpty()
    .matches("^(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)){3}$")
    .withMessage('Your game server hostname (IPv4 address) must be a valid IPv4 address between 0.0.0.0 and 255.255.255.255'),

    body('game_server_port_input')
    .isNumeric()
    .trim()
    .notEmpty()
    .matches("^(102[4-9]|10[3-9][0-9]|1[1-9][0-9]{2}|[2-9][0-9]{3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$")
    .withMessage('Your game server port must be a number between 1024 and 65535'),
    
    async (request, response) => {

    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        request.session.alert_title = 'Validation errors';
        request.session.alert_description = '<ul id="error_message_list">' + errors.array().map(error => `<li>${error.msg}</li>`).join('') + '</ul>';
        request.session.show_error_modal = true;
            return response.redirect('/admin/gameserverdata');
    }

    const request_user_id = request.user.guild_id;
    const botRepository = request.user.bot_repository;

    const game_server_data = {
        guild_id: request_user_id,
        game_server_hostname_input: request.body.game_server_hostname_input,
        game_server_port_input: request.body.game_server_port_input
    };
    try {
        await botRepository.createBotGameServerData(game_server_data);
        // Store the success message in the session
        request.session.alert_title = 'Successfully submitted changes';
        request.session.alert_description = 'You have successfully changed the game server IPv4 address and port number';
        request.session.show_submit_modal = true;
        response.redirect('/admin/gameserverdata');
    } catch (error) {
        console.error(`There was an error when attempting to update the game server IP address and port number: ${error}`);
        // Store the error message in the session
        request.session.alert_title = 'Error submitting changes';
        request.session.alert_description = `Please try submitting this form again or contact the server administrator if you believe this is an error: ${error}`;
        request.session.show_error_modal = true;
        response.redirect('/admin/gameserverdata');
    }
});


router.post('/botcommand/new', isLoggedIn, checkBotRepositoryInCache, 
    body('command_name')
    .trim()
    .notEmpty()
    .matches("^[A-Za-z0-9]{1,50}$")
    .withMessage('The command name can be a maximum of 50 characters and numbers'),

    body('command_description')
    .trim()
    .notEmpty()
    .matches("^[A-Za-z0-9\\-_=+\\{};:'\",<.>/?\\[\\] ]{1,1000}$")
    .withMessage('The command description can be a maximum of 1000 characters and numbers'),

    body('command_cost_input')
    .isNumeric()
    .matches("^[0-9]{1,6}$")
    .withMessage('The command cost must be a number between 0 and 6 digits long'),
    
    async (request, response, next) => {

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
    };

    console.log(new_bot_package);

    try {
        await botRepository.createBotItemPackage(new_bot_package);
        response.render('admin/new_command', {
            user: request.user,
            page_title:`Create new command`,
            alert_title: `Successfully created new package`,
            alert_description: `You have successfully created a new item package and registered it with your bot`,
            show_submit_modal: true
        });
    } catch (error) {
        response.render('admin/new_command', {
            user: request.user,
            page_title:`Error`,
            alert_title: `Error creating new package`,
            alert_description: `Please try submitting this form again or contact the server administrator if you believe this is an error: ${error}`,
            show_error_modal: true
        });
    }
});

router.delete('/deletecommand/:packageName', isLoggedIn, checkBotRepositoryInCache, async (request, response) => {
    const packageName = request.params.packageName;
    const botRepository = request.user.bot_repository;

    try {
        const deletion_result = await botRepository.deleteBotPackageByName(packageName);
        if (deletion_result.deletedCount === 1) {
            request.session.alert_title = 'Command Deleted';
            request.session.alert_description = `The command "${packageName}" was successfully deleted.`;
            request.session.show_submit_modal = true;
            response.redirect('/admin/');
        } else {
            request.session.alert_title = 'Deletion Failed';
            request.session.alert_description = `The command "${packageName}" could not be found.`;
            request.session.show_error_modal = true;
            response.redirect('/admin/');
        }
    } catch (error) {
        console.error(`There was an error when attempting to delete the command: ${error}`);
        request.session.alert_title = 'Server Error';
        request.session.alert_description = `An error occurred while attempting to delete the command: ${error}`;
        request.session.show_error_modal = true;
        response.redirect('/admin/');
    }
});

export default router;