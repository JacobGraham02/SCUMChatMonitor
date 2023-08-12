require('dotenv').config({ path:'.env' });

/**
 * Nodejs and express specific dependencies
 */
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
const crypto = require('crypto');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { exec } = require('child_process');
const fs = require('node:fs');
const FTPClient = require('ftp');
const MongoStore = require('connect-mongo');
const { Client, Collection, GatewayIntentBits } = require('discord.js');


/**
 * Modules and other files which are custom made for the application
 */
const hashAndValidatePassword = require('./modules/hashAndValidatePassword');
const DatabaseConnectionManager = require('./database/DatabaseConnectionManager');
const UserRepository = require('./database/UserRepository');
const { discord_bot_token } = require('./config.json');
//const sendEmail = require('./mailer');
var indexRouter = require('./routes/index');
var adminRouter = require('./routes/admin');

const client_instance = new Client({
    intents: [GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    ]
});

/** Each channel in a discord server is identified by a unique integer value
 * 
 */
const discord_chat_channel_bot_commands = '1125874103757328494';

/** Initialize utility classes before using them to increase speed and efficiently allocate memory
 * 
 */
databaseConnectionManager = new DatabaseConnectionManager();
userRepository = new UserRepository();

/**
 * The following regex string is for steam ids associated with a steam name specifically for the login log file. 
 * They are saved as a 17-digit number (e.g. 12345678912345678)
 */ 
const login_log_steam_id_regex = /([0-9]{17})/g;

/**
 * The following regex string is for steam ids associated with a steam name specifically for the chat log file. 
 * Like the login file, they are saved as a 17-digit number (e.g. 12345678912345678)
 */
const chat_log_steam_id_regex = /([0-9]{17})/g;


/**
 * The following regex string is for steam names which match the same format as the ones in gportal's ftp files: username(number); e.g. boss612man(100)
 */
const login_log_steam_name_regex = /([a-zA-Z0-9 ._-]{0,32}\([0-9]{1,10}\))/g;

/**
 * The below commented out regex string matches all of the chat log messages sent by the chat bot, Wilson. This regex string can be used to keep track of Wilson. 
 * const chat_log_messages_from_wilson_regex = /('76561199505530387:Wilson\24\' '?:Local|Global|Admin:.*)'/g; 
 */

/**
 * The following regex string is for chat messages when they appear in the chat log file. 
 */
const chat_log_messages_regex = /(?<=Global: |Local: |Admin: )![^\n]*[^'\n]/g;


const login_log_wilson_logged_out_regex = /[0-9]{17}:Wilson\([0-9]{1,3}\)' logged out at:/g;

/**
 * The following 3 strings must be hardcoded according to how the gportal ftp server is structured. The use of 2 \\ characters is necessary to equal one \ character
 */
const gportal_ftp_server_target_directory = 'SCUM\\Saved\\SaveFiles\\Logs\\';
const gportal_ftp_server_filename_prefix_login = 'login_';
const gportal_ftp_server_filename_prefix_chat = 'chat_';

/**
 * TCP connections are established at this port 
 */
const server_port = 3000;

/**
 * hardcoded gportal ftp configuration to connect with the ftp server
 */
const gportal_ftp_config = {
    host: process.env.gportal_ftp_hostname,
    port: process.env.gportal_ftp_hostname_port,
    user: process.env.gportal_ftp_username,
    password: process.env.gportal_ftp_password,
};

/**
 * Name of username and login fields used on the login form 
 */
const username_and_password_fields = {
    username_field: 'username',
    password_field: 'password'
};

var app = express();

/**
 * Initial configuration to enable express to use Mongodb as a storage location for session information
 */
app.use(session({
    secret: process.env.express_session_key,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.mongodb_connection_string })
}));

app.use(passport.initialize());
app.use(passport.session());

/**
 * existing_cached_file_content_hash is a variable which stores a hashed version of the raw file contents retrieved from the ftp log files in gportal
 */
let existing_cached_file_content_hash_chat_log = '';
let existing_cached_file_content_hash_login_log = '';

/**
 * ftp_login_file_lines_already_processed stores a value which holds the number of lines in a file already processed. When a new line appears in the chat log, instead of
 * dealing with all commands in the current file, this variable will ensure only the lines after the specified line are acted upon
 */
let ftp_login_file_lines_already_processed = 0;

/**
 * last_line_processed stores the last line processed as another safeguard so that only lines in the file after the specified one are executed
 */
let last_line_processed = 0;

const login_times = new Map();

const user_balance_updates = new Map();

const new_users_on_server = new Map();

/**
 * This function loops through each of the strings located in the string array 'logs', and parses out various substrings to manipulate them.
 * 
 * @param {string[]} logs An array of strings that represents the contents of the FTP login file on gportal.  
 * */
async function determinePlayerLoginSessionMoney(logs) {
    for (const log of logs) {
        if (log.includes("Game version: ") || log === '') {
            continue;
        } 
        /**
         * The result of log.split(": ") is an array containing a substring before and after the ':' character in each string 'log'. The destructured array variable 'logTimestamp'
         * contains the substring before the ':' character, and the array variable 'logMessage' contains the substring after the ':' character. 
         */ 
        const [logTimestamp, logMessage] = log.split(": ");

        if (logMessage.includes('logged in') || logMessage.includes('logged out')) {
            const matchResult = logMessage.match(/'(.*?) (.*?):(.*?)'(.*?)(logged in|logged out)/);

            if (matchResult) {
                /**
                 * If a string is found to match all of the rules defined in the regex pattern /'(.*?) (.*?):(.*?)(logged in|logged out)/, an array containing 6 values will be returned.
                 * We are only interested in the 3rd and 6th value, so we ignore the other values in the array by using the , character. 
                 * By using the logTimestamp substring stored earlier, we can replace individual characters in the substring to construct a string which can be converted into a valid
                 * javascript object. The format for a javascript Date object used here is as follows: YYYY-MM-DDTHH:mm:ss. If you are interested, this matches the pattern presented in widely-
                 * accepted ISO 8601 date format. 
                 */
                const [, , user_steam_id, , , user_logged_in_or_out] = matchResult;
                const formatted_date_and_time = new Date(logTimestamp.replace('-', 'T').replace(/\./g, '-').replace(/(?<=T.*)-/g, ':'));

                /**
                 * Each time the user logs in, a Map is updated with their log in steam id and time, so we can begin the process of giving them some amount of discord money depending
                 * on the length of time that has spanned between their current log in time and their future log out time. Once the user has logged out, we need to fetch their log 
                 * in time from the Map. 
                 */
                if (user_logged_in_or_out === 'logged in') {
                    login_times.set(user_steam_id, formatted_date_and_time);
                } else if (user_logged_in_or_out === 'logged out') {
                    const login_time = login_times.get(user_steam_id);

                    /**
                     * The variable calculated_elapsed_time holds the value in milliseconds. Therefore, to get the time in hours, we have to perform the math calculation 1000 / 60 / 60.
                     * Now that we have the play time in hours, we can multiply that play time by 1000 to get the amount of money they will get. Let us suppose initially a user has 0 
                     * discord money. Next, they play on our server for 1.5 hours and log off. Then, their total amount of money earned will be 1500. 
                     * After we record the user log in and log out time, we will delete that record from the Map to ensure we do not duplicate the money-giving operation.
                     */
                    if (login_time) {
                        const calculated_elapsed_time = ((formatted_date_and_time - login_time) / 1000 / 60 / 60);
                        const user_account_balance = Math.round(calculated_elapsed_time * 1000);

                        user_balance_updates.set(user_steam_id, user_account_balance);
                        login_times.delete(user_steam_id);
                    }
                }
            }
        }
    }

    /**
     * This is the loop which fetches both the user steam id and their total amount of discord money earned from the Map. For each user within the Map that has both a log in and log out time,
     * their database record is updated with the amount of money they earned in this specific play session. 
     * If the operation fails for whatever reason, the app developer will get an email stating this, and the app will also crash. 
     */
    for (const [user_steam_id, update] of user_balance_updates) {
        try {
            await userRepository.updateUserAccountBalance(user_steam_id, update);
        } catch (database_updated_error) {
            sendEmail(process.env.scumbot_chat_monitor_email_source, "SCUMBotChatMonitor update account balance fail", `There was an error when the SCUM bot attempted to give the user ${user_steam_id} money for being online the server`);
            console.error(`Failed to update user account balance for user with steam id ${user_steam_id}`);
        }
    }
}
async function readAndFormatGportalFtpServerLoginLog(request, response) {
    try {
        const ftpClient = new FTPClient();
        await new Promise((resolve, reject) => {
            ftpClient.on('ready', resolve);
            ftpClient.on('error', reject);
            ftpClient.connect(gportal_ftp_config);
        });

        const files = await new Promise((resolve, reject) => {
            ftpClient.list(gportal_ftp_server_target_directory, (error, files) => {
                if (error) {
                    console.log('Error retrieving file listing:', error);
                    reject('Failed to retrieve file listing');
                } else {
                    resolve(files);
                }
            });
        });

        const matching_files = files
            .filter(file => file.name.startsWith(gportal_ftp_server_filename_prefix_login))
            .sort((file_one, file_two) => file_two.date - file_one.date);

        if (matching_files.length === 0) {
            response.status(500).json({ message: `No files were found that started with the prefix ${gportal_ftp_server_filename_prefix_login}` });
            ftpClient.end();
            return;
        }

        const filePath = `${gportal_ftp_server_target_directory}${matching_files[0].name}`;

        const stream = await new Promise((resolve, reject) => {
            ftpClient.get(filePath, (error, stream) => {
                if (error) {
                    reject(`The file was present in gportal, but could not be fetched. ${error}`);
                } else {
                    resolve(stream);
                }
            });
        });

        let file_contents = '';
        await new Promise((resolve, reject) => {
            stream.on('data', (chunk) => {
                /**
                 * console.log(`Stream data is incoming from the specific FTP server log`);
                 */
                file_contents += chunk;
            });

            stream.on('end', () => {
                /**
                 * console.log(`Data stream from the specific FTP server log has completed successfully`);
                 * console.log('File contents retrieved from the data stream: ', file_contents);
                 */
                resolve();
            });

            stream.on('error', reject);
        });

        const current_file_content_hash = crypto.createHash('md5').update(file_contents).digest('hex');

        if (current_file_content_hash === existing_cached_file_content_hash_login_log) {
            return;
        } else {
            existing_cached_file_content_hash_login_log = current_file_content_hash;
        }

        const browser_file_contents = file_contents.replace(/\u0000/g, '');


        const browser_file_content_individual_lines = browser_file_contents.split('\n');

        // If we have already processed the lines that exist in the ftp file, remove them
        if (ftp_login_file_lines_already_processed < browser_file_content_individual_lines.length) {
            browser_file_content_individual_lines.splice(0, ftp_login_file_lines_already_processed);
        }
        /**
         * Update the number of lines already processed in the log file from gportal. This will prevent the entire log file from being read again when the file changes
         */
        ftp_login_file_lines_already_processed = browser_file_content_individual_lines.length;

        //const new_file_content = browser_file_content_individual_lines.join('\n');

        /**
         * The return values from the .match() function return an object containing the substrings which match the pattern specified in the regex string
         */
        const file_contents_steam_ids = browser_file_contents.match(login_log_steam_id_regex);
        const file_contents_steam_messages = browser_file_contents.match(login_log_steam_name_regex);

        if (browser_file_contents.match(login_log_wilson_logged_out_regex)) {
            moveCursorToContinueButtonAndPressContinue();
        }

        const file_contents_steam_ids_array = Object.values(file_contents_steam_ids);
        const file_contents_steam_name_array = Object.values(file_contents_steam_messages);

        const user_steam_ids = {};
        for (let i = 0; i < file_contents_steam_ids_array.length; i++) {
            user_steam_ids[file_contents_steam_ids_array[i]] = file_contents_steam_name_array[i];
        }
        await teleportNewPlayersToLocation(user_steam_ids);
       
        //determinePlayerLoginSessionMoney(browser_file_content_individual_lines);
        await insertSteamUsersIntoDatabase(Object.keys(user_steam_ids), Object.values(user_steam_ids));
        
        ftpClient.end();
    } catch (error) {
        //sendEmail(process.env.scumbot_chat_monitor_email_source, 'SCUMChatMonitor error', `There was an error reading the login log file from gportal, and the bot may have crashed. The error message is below: ${error}`);
        console.log('Error processing files:', error);
        response.status(500).json({ error: 'Failed to process files' });
        process.exit();
    }
}
/**
 * This function determines if players joining the server are new. If so, they are teleported to a specific area on the map. 
 * The players are teleported to a specific area so they can read relevant server information. 
 * If the mongodb database results return a user who has the property 'user_joining_server_first_time' as a value of '0', a command is added to the command queue which will teleport them
 * 
 * @param {any} online_users a Map containing the key-value pairs of user steam id and user steam name
 */
async function teleportNewPlayersToLocation(online_users) { 
    let user_name = '';
    /**
     * Iterate over each key in the Map online_users. Each key in the Map is the steam id of the user
     */
    for (const key in online_users) {
        /**
         * Replacing the ' characters enclosing the string so we get a valid number
         */
        key.replace(/'/g, "");
        userRepository.findUserByIdIfFirstServerJoin(key).then((user_first_join_results) => {
            if (user_first_join_results) {
                /**#T
                 * Replacing the ' character and the ([0-9]{1,3}) character instance in the string to make a valid steam player name
                 */
                user_name = user_first_join_results.user_steam_name.replace('', "").replace(/\(([0-9]{1,3})\)/, "");
                runCommand(`#Teleport -129023.125 -91330.055 36830.551 ${user_name}`);
            }
            userRepository.updateUser(key, { user_joining_server_first_time: 1 });
        });
    }
}
async function readAndFormatGportalFtpServerChatLog(request, response) {
    try {
        const ftpClient = new FTPClient();
        await new Promise((resolve, reject) => {
            ftpClient.on('ready', resolve);
            ftpClient.on('error', reject);
            ftpClient.connect(gportal_ftp_config);
        });

        const files = await new Promise((resolve, reject) => {
            ftpClient.list(gportal_ftp_server_target_directory, (error, files) => {
                if (error) {
                    console.log('Error retrieving file listing:', error);
                    reject('Failed to retrieve file listing');
                } else {
                    resolve(files);
                }
            });
        });
        const matching_files = files
            .filter(file => file.name.startsWith(gportal_ftp_server_filename_prefix_chat))
            .sort((file_one, file_two) => file_two.date - file_one.date);

        if (matching_files.length === 0) {
            response.status(500).json({ message: `No files were found that started with the prefix ${gportal_ftp_server_filename_prefix_chat}` });
            ftpClient.end();
            return;
        }

        const filePath = `${gportal_ftp_server_target_directory}${matching_files[0].name}`;

        const stream = await new Promise((resolve, reject) => {
            ftpClient.get(filePath, (error, stream) => {
                if (error) {
                    reject(`The file was present in gportal, but could not be fetched. ${error}`);
                } else {
                    resolve(stream);
                }
            });
        });

        let file_contents = '';
        await new Promise((resolve, reject) => {
            stream.on('data', (chunk) => {
                //console.log(`Stream data is incoming from the specific FTP server log`);
                file_contents += chunk;
            });

            stream.on('end', () => {
                //console.log(`Data stream from the specific FTP server log has completed successfully`);
                //console.log('File contents retrieved from the data stream: ', file_contents);
                resolve();
            });

            stream.on('error', reject);
        });
        const current_file_content_hash = crypto.createHash('md5').update(file_contents).digest('hex');
        if (current_file_content_hash === existing_cached_file_content_hash_chat_log) {
            return;
        } else {
            existing_cached_file_content_hash_chat_log = current_file_content_hash;
        }

        const browser_file_contents = file_contents.replace(/\u0000/g, '');

        const browser_file_contents_lines = browser_file_contents.split('\n');

        const file_contents_steam_id_and_messages = [];

        for (let i = last_line_processed; i < browser_file_contents_lines.length; i++) {
            if (browser_file_contents_lines[i].match(chat_log_messages_regex)) {
                file_contents_steam_id_and_messages.push({
                    key: browser_file_contents_lines[i].match(chat_log_steam_id_regex),
                    value: browser_file_contents_lines[i].match(chat_log_messages_regex)
                });
            }
        }

        last_line_processed = browser_file_contents_lines.length;

        return file_contents_steam_id_and_messages;
        
        ftpClient.end();
    } catch (error) {
        //sendEmail(process.env.scumbot_chat_monitor_email_source, 'SCUMChatMonitor error', `There was an error reading the chat log file from gportal, and the bot may have crashed. Below is the error message: ${error}`);
        console.log('Error processing files:', error);
        response.status(500).json({ error: 'Failed to process files' });
        process.exit();
    }
}

/**
 * Start an interval of reading chat log messages from gportal which repeats every 5 seconds
 */
function startFtpFileProcessingIntervalChatLog() {
    read_login_ftp_file_interval = setInterval(handleIngameSCUMChatMessages, 5000);
}

/**
 * Start an interval of reading login log messages from gportal which repeats every 5 seconds
 */
function startFtpFileProcessingIntervalLoginLog() {
    read_login_ftp_file_interval = setInterval(readAndFormatGportalFtpServerLoginLog, 10000);
}

/**
 * Terminate any existing intervals for the gportal login file
 */
function stopFileProcessingIntervalLoginFile() {
    clearInterval(read_login_ftp_file_interval);
}

/**
 * Terminate any existing intervals for the gportal ingame chat file
 */
function stopFileProcessingIntervalChatFile() {
    clearInterval(read_login_ftp_file_interval);
}

/**
 * Inserts a document into the mongodb collection 'Administrators'. These users are the only ones who can access the bot web interface.
 * The admin username is passed in plain text (Effective July 09, 2023) and will be hashed at a later date. 
 * The admin password is both hashed and salted.
 * @param {any} admin_user_username A string representation of the data submitted on the login form
 * @param {any} admin_user_password A string representation of the data submitted on the login form
 */
function insertAdminUserIntoDatabase(admin_user_username, admin_user_password) {
    database_manager = new DatabaseConnectionManager();
    user_repository = new UserRepository();

    const hashed_admin_user_password = hashAndValidatePassword.hashPassword(admin_user_password);

    user_repository.createAdminUser(admin_user_username, hashed_admin_user_password);
}
/**
 * Reads all of the documents from a specified collection in mongodb. 
 */
async function readSteamUsersFromDatabase() {
    database_manager = new DatabaseConnectionManager();
    user_repository = new UserRepository();
    user_repository.findAllUsers().then((results) => { console.log(results) });
}

/**
 * Inserts a specified steam user into the database along with their associated steam id
 * @param {any} steam_user_ids_array An array containing only 17-digit string representation of only digits 0-9
 * @param {any} steam_user_names_array An array containing only string representations of a steam username
 */
async function insertSteamUsersIntoDatabase(steam_user_ids_array, steam_user_names_array) {
    database_manager = new DatabaseConnectionManager();
    user_repository = new UserRepository();

    for (let i = 0; i < steam_user_ids_array.length; i++) {
        user_repository.createUser(steam_user_names_array[i], steam_user_ids_array[i]);
    }
}
/**
 * verifyCallback() is a subjectively necessary function to use in all web applications when using express and passport. In this instance, verifyCallback() is the 
 * function that is called internally when you are storing a user object in a session after logging in. Here are the steps in sequence:
 * 1) verifyCallback first attempts to find a user by their submitted username and password
 *  1a) If a user cannot be found, the result is null. The user is not permitted to go to any pages requiring a session with a user object.
 * 2) When the asyncronous database operation returns a user found, the properties from the returned object are stored in local variables. From there, the password 
 *    submitted on the login page by the user is hashed & salted and compared with the password existing in the database.
 * 3) An 'admin' object is created to attach to the established user session. This object contains the uuid and username of the admin, so relevant details can be fetched
 *    from the database if needed.
 * 4) If the hashed and salted user submitted password matches what was found in the database, express establishes a session, stores a session key in mongodb for 
 *    persistence, and attaches the admin object to the session. 
 * @param {any} username
 * @param {any} password
 * @param {any} done
 */
const verifyCallback = (username, password, done) => {
    database_manager = new DatabaseConnectionManager();
    user_repository = new UserRepository();
    user_repository.findAdminByUsername(username).then((admin_data_results) => {
        if (admin_data_results === null) {
            return done(null, false);
        }
        const admin_uuid = admin_data_results.admin_id;
        const admin_username = admin_data_results.admin_username;
        const admin_password_hash = admin_data_results.admin_password_hash;
        const admin_password_salt = admin_data_results.admin_password_salt;

        const is_valid_administrator_account = hashAndValidatePassword.validatePassword(password, admin_password_hash, admin_password_salt);

        const admin = {
            uuid: admin_uuid,
            username: admin_username,
        };

        if (is_valid_administrator_account) {
            return done(null, admin);
        } else {
            return done(null, false);
        }
    }).catch((error) => console.error(`An error has occured during the execution of verifyCallback: ${error}`));
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/admin', adminRouter);

app.post('/login', passport.authenticate('local', {
    successRedirect: 'admin/login-success',
    failureRedirect: 'login-failure'
}));

app.get('/login-failure', function (request, response, next) {
    response.render('login', {
        title: "Invalid login", invalid_login_message: 'Invalid login credentials. Please try again with a different set of credentials.'
    });
});

const strategy = new LocalStrategy(username_and_password_fields, verifyCallback);
passport.use(strategy);

passport.serializeUser(function (admin, done) {
    done(null, admin.uuid);
});

/**
 * This is used in conjunction with serializeUser to give passport the ability to attach 
 */
passport.deserializeUser(function (uuid, done) {
    database_manager = new DatabaseConnectionManager();
    user_repository = new UserRepository();
    user_repository.findAdminByUuid(uuid).then(function (admin_data_results) {
        done(null, admin_data_results);
    }).catch(error => {
        done(error, null);
    });
});

/**
 * Creates a 404 error when the application tries to navigate to a non-existent page.
 */
app.use(function (req, res, next) {
    next(createError(404));
});

app.listen(server_port, function () {
    console.log(`Server is running on port ${server_port}`);
})

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

/**
 * Read all of the '*.js' files from the 'commands' directory and store them in command_files_list for use later
 */
const commands_path = path.join(__dirname, 'commands');
const command_files_list = fs.readdirSync(commands_path).filter(file => file.endsWith('.js'));

/**
 * Define 2 properties on the client_instance object, which will both be empty collections. 
 */
client_instance.commands = new Collection();
client_instance.discord_commands = new Collection();

/**
 * Using the command_files_list we populated earlier, we have to dynamically import each of the functions and extract the object returned from those functions.
 * After we have retrieved the functions and objects, we put the imported functions into client_instance.commands, and the function objects into client_instance.discord_commands
 */
for (const command_file of command_files_list) {
    const command_file_path = path.join(commands_path, command_file);
    const command = require(command_file_path);
    const command_object = command('test');
    client_instance.commands.set(command_object.data.name, command);
    client_instance.discord_commands.set(command_object.data.name, command_object);
}
/**
 * The discord API triggers an event called 'ready' when the discord bot is ready to respond to commands and other input. 
 */
client_instance.on('ready', () => {
    console.log(`The bot is logged in as ${client_instance.user.tag}`);
});

/**
 * When an interaction (command) to executed on discord - for example: !discord - the discord API triggers an event called 'interactionCreate'. 
 */
client_instance.on('interactionCreate',
    /**
     * When the discord API triggers the interactionCreate event, an asynchronous function is executed with the interaction passed in as a parameter value. 
     * If the interaction is not a command, the function does not continue executing.
     * @param {any} interaction 
     * @returns ceases execution of the function if the interaction is not a command, if the user sent the message in the wrong channel, or if the user cannot use this command
     */
    async (interaction) => {
    if (!interaction.isCommand()) {
        return;
    }

    /**
     * The in-memory collection that stores the discord command is searched. If the collection contains the target interaction, we fetch that command for use later.
     */
    
    const command = client_instance.discord_commands.get(interaction.commandName);

    if (!command) {
        return;
    }

    if (!(determineIfUserMessageInCorrectChannel(interaction.channel.id, discord_chat_channel_bot_commands))) {
        await interaction.reply({ content: `You are using this command in the wrong channel` });
        return;
    }
    
    if (determineIfUserCanUseCommand(interaction.member, command.authorization_role_name)) { 
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephermal: true });
        }

    } else {
        await interaction.reply({ content: `You do not have permission to execute the command ${command.data.name}` });
    }
});
/**
 * Uses the Windows powershell command 'System.Windows.Forms.Clipboard]::SetText() to copy some text to the system clipboard
 * In the else clause, there is a debug log message if you want to uncomment that for development purposes
 * @param {string} text A string of text which will be copied to the system clipboard 
 */
function copyToClipboard(text) {
    const command = `powershell.exe -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::SetText('${text.replace(/'/g, "''")}')"`
    exec(command, (error) => {
        if (error) {
            console.error('Error copying to clipboard:', error);
        } else {
            //console.log('Text copied to clipboard.');
        }
    });
}

/**
 * Uses the Windows powershell command '[System.Windows.Forms.SendKeys]::SendWait('^v') to simulate a key press sequence that pastes text.
 * In this application specifically, this function pastes text into the active window, which is SCUM.exe. 
 * If you are using this function in sequence with other ones which use powershell, you must use the sleep() function in between powershell uses so the system can 
 * change states appropriately and not cause bottlenecks. 
 */
function pasteFromClipboard() {
    const command = `powershell.exe -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"`
    exec(command, (error) => {
        if (error) {
            console.error('Error pasting from clipboard:', error);
        } else {
            //console.log('Text pasted from clipboard.');
        }
    });
}

/**
 * Uses the Windows powershell command '[System.Windows.Forms.SendKeys]::SendWait('{TAB}') to simulate a tab key press on the active window. In this case, the active
 * window is SCUM.exe. The tab key switches channels between 'Local', 'Global', 'Admin', and 'Squad'. Currently, this function is not in use and is here for your convenience. 
 * If you are using this function in sequence with other ones which use powershell, you must use the sleep() function in between powershell uses so the system can 
 * change states appropriately and not cause bottlenecks. 
 */
function pressTabKey() {
    const command = `powershell.exe -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{TAB}')"`;
    exec(command, (error) => {
        if (error) {
            console.error('Error simulating the a tab key press');
        } else {
            //console.log('Tab key press simulated');
        }
    });
}

/**
 * Uses the Windows powershell command '[System.Windows.Forms.SendKeys]::SendWait('t') to simulate a 't' character key press on the active window. 
 * In this case, the active window is SCUM.exe. The t character brings actives the in-game chat menu if it is not already active. 
 * If you are using this function in sequence with other ones which use powershell, you must use the sleep() function in between powershell uses so the system can 
 * change states appropriately and not cause bottlenecks. 
 */
function pressCharacterKeyT() {
    const command = `powershell.exe -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('t')`;
    exec(command, (error) => {
        if (error) {
            console.error('T character simulating enter key press:', error);
        } else {
            //console.log('T character key press simulated');
        }
    });
}

/**
 * Uses the Windows powershell command '[System.Windows.Forms.SendKeys]::SendWait('{BACKSPACE}') to simulate a backspace key press on the active window. 
 * In this case, the active window is SCUM.exe. The backspace key will execute immediately after pressCharacterT(), erasing the 't' character from chat if the chat window
 * is already active. 
 * If you are using this function in sequence with other ones which use powershell, you must use the sleep() function in between powershell uses so the system can 
 * change states appropriately and not cause bottlenecks. 
 */
function pressBackspaceKey() {
    const command = `powershell.exe -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{BACKSPACE}')`;
    exec(command, (error) => {
        if (error) {
            console.error('Error simulating backspace key press:', error);
        } else {
            //console.log('Backspace key press simulated');
        }
    });
}

function moveMouseToContinueButtonXYLocation() {
    const x_cursor_position = 470;
    const y_cursor_position = 550;
    const command = `powershell.exe -command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class P { [DllImport(\\"user32.dll\\")] public static extern bool SetCursorPos(int x, int y); }'; [P]::SetCursorPos(${x_cursor_position}, ${y_cursor_position})"`;
    exec(command, (error) => {
        if (error) {
            console.error(`Error moving the mouse the mouse to x 470, y 550 and left-clicking:${error}`);
        } else {
            // console.log('Mouse cursor moved to x 470 y 550 and the left mouse button was pressed');
        }
    });
}

function pressMouseLeftClickButton() {
    const command = `powershell.exe -command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class P { [DllImport(\\"user32.dll\\")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo); }'; $leftDown = 0x0002; $leftUp = 0x0004; [P]::mouse_event($leftDown, 0, 0, 0, 0); [P]::mouse_event($leftUp, 0, 0, 0, 0);"`;
    exec(command, (error) => {
        if (error) {
            console.error(`Error when simulating a left click on the mouse`);
        } else {
            // console.log('Left click button on mouse was clicked');
        }
    });
}

/**
 * Uses the Windows powershell command '[System.Windows.Forms.SendKeys]::SendWait('{Enter}') to simulate an 'enter' character key press on the active window. 
 * In this case, the active window is SCUM.exe. The enter key sends a message in chat when pressed. 
 * If you are using this function in sequence with other ones which use powershell, you must use the sleep() function in between powershell uses so the system can 
 * change states appropriately and not cause bottlenecks. 
 */
function pressEnterKey() {
    const command = `powershell.exe -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{Enter}')`;
    exec(command, (error) => {
        if (error) {
            console.error('Error simulating enter key press:', error);
        } else {
            //console.log('Enter key press simulated');
        }
    });
}
/**
 * An asynchronous function which pauses the execution of the application for a specified number of milliseconds. This is required when you are using Windows powershell
 * to prevent bottlenecks, slowdowns, or other abnormal system operations. 
 * In this instance, a promise is an operation that will prevent further execution of code. 
 * @param {number} milliseconds The total number of milliseconds to halt the application execution for.
 * @returns Returns a promise that will resolve itself after a certain number of milliseconds. 
 */
function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * This function utilizes all of the above utility functions that interact with Windows via powershell. As mentioned, each time on of those functions are used, 
 * an 'await sleep()' blocker must be used for system stability. 
 * @param {string} command A string value containing the SCUM command to run in-game
 * @returns if the system cannot detect the SCUM process currently running, the function will cease execution. 
 */
async function runCommand(command) {
    const scumProcess = exec('powershell.exe -c "Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public class User32 { [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr hWnd); }\'"');
    if (!scumProcess) {
        return;
    }
    await sleep(150);
    copyToClipboard(command);
    await sleep(150);
    pasteFromClipboard();
    await sleep(150);
    pressEnterKey();
    await sleep(150);
}

async function moveCursorToContinueButtonAndPressContinue() {
    const scumProcess = exec('powershell.exe -c "Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public class User32 { [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr hWnd); }\'"');
    if (!scumProcess) {
        return;
    }
    await sleep(1000);
    moveMouseToContinueButtonXYLocation();
    await sleep(1000);
    pressMouseLeftClickButton();
    await sleep(1000);
}

const command_queue = [];
let isProcessing = false;
function enqueueCommand(user_chat_message_object) {
    command_queue.push(user_chat_message_object);
}

/**
 * This function iterates through all of the SCUM in-game chat messages starting with '!' recorded into the gportal chat log into a queue in preparation 
 * for sequential execution.
 */
startFtpFileProcessingIntervalLoginLog();
//startFtpFileProcessingIntervalChatLog();
async function handleIngameSCUMChatMessages() {
    const ftp_server_chat_log = await readAndFormatGportalFtpServerChatLog();

    if (!ftp_server_chat_log) {
        return;
    } 

    for (let i = 0; i < ftp_server_chat_log.length; i++) {
        let user_chat_message_object = ftp_server_chat_log[i];
        enqueueCommand(user_chat_message_object);
    }
    if (!isProcessing) {
        processQueue();
    }
}
async function processQueue() {
    isProcessing = true;

    while (command_queue.length > 0) { // While there are commands in the queue
        const user_chat_message_object = command_queue.shift(); // Remove the next command from the queue

        const command_to_execute = user_chat_message_object.value[0].substring(1);
        const command_to_execute_steam_id = user_chat_message_object.key[0];

        if (!client_instance.commands.get(command_to_execute)) {
            continue;
        }

        const user_account = await userRepository.findUserById(command_to_execute_steam_id);
        const user_account_balance = user_account.user_money;
        const function_property_data = client_instance.commands.get(command_to_execute)(user_account);
        const client_command_data = function_property_data.command_data;
        const client_command_data_cost = function_property_data.command_cost;
        const client_ingame_chat_name = user_account.user_steam_name.replace(/\([0-9]{1,4}\)/g, '');           

        if (command_to_execute === 'welcomepack') {
            const welcome_pack_cost = user_account.user_welcome_pack_cost;
             if (user_account_balance < welcome_pack_cost) {
                 runCommand(`${client_ingame_chat_name} you do not have enough money to use your welcome pack again. Use the command !balance to check your balance`);
                 continue;
             } else {
                 await userRepository.updateUserWelcomePackUsesByOne(user_account.user_steam_id);
             }
        }

        if (user_account_balance < function_property_data.command_cost) {
            console.log(`${client_ingame_chat_name}, you do not have enough money to use this package. Use the command !balance to check your balance.`);
            continue;
        }

        if (!(client_command_data_cost === undefined)) {
            await userRepository.updateUserAccountBalance(command_to_execute_steam_id, -client_command_data_cost);
        }

        pressCharacterKeyT();
        pressBackspaceKey();

        for (let i = 0; i < client_command_data.length; i++) {
            await runCommand(client_command_data[i]);
        } 
    }
    isProcessing = false; // Set the processing flag to false when all commands have been processed
}
//moveCursorToContinueButtonAndPressContinue
/**
 * Bot interacts with the discord API to 'log in' and become ready to start executing commands
 */
client_instance.login(discord_bot_token);

/**
 * When a user executes a bot command in the correct channel, this function will determine if the user is allowed to use the command. 
 * This is determined by an array of values in the property 'authorization_role_name' in each of the command files. 
 * @param {any} message_sender
 * @param {any} client_command_values
 * @returns
 */
function determineIfUserCanUseCommand(message_sender, client_command_values) {
    if (client_command_values.authorization_role_name === undefined) {
        return true;
    }
    return message_sender.roles.cache.some(role => client_command_values.authorization_role_name.includes(role.name));
}

/**
 * When a user is attempting to use bot commands on discord, this function will tell the user if they sent the bot command in the correct chnnael.
 * @param {number} channel_message_was_sent A number data type that contains the id of the discord channel where the bot command was sent  
 * @param {number} discord_bot_channel_id A number data type that contains the id of the discord channel where the bot command must be sent
 * @returns a boolean value indicating whether the user sent the bot command in the correct channel 
 */
function determineIfUserMessageInCorrectChannel(channel_message_was_sent, discord_bot_channel_id) { 
    return channel_message_was_sent === discord_bot_channel_id;
}

/**
 * The commented out function 'checkIfScumGameRunning' can be used for development or debugging purposes to find out if your system can identify when the SCUM
 * game is running 
 */

/*function checkIfScumGameRunning(callback) {
    const processName = 'SCUM';

    const command = `tasklist /FI "IMAGENAME eq ${processName}.exe"`;

    exec(command, (error, stdout, stderr) => {
        if (error || stderr) {
            console.error(`Error executing command: ${error || stderr}`);
            callback(false);
            return;
        }

        const output = stdout.toLowerCase();

        // Check if the process name exists in the output
        const isRunning = output.includes(processName.toLowerCase());

        callback(isRunning);
    });
}

setInterval(() => {
    checkIfScumGameRunning((isRunning) => {
        if (isRunning) {
            console.log("The SCUM game is running, and the process can be detected");
        } else {
            console.log("The SCUM game is either not running, or the process can be detected");
        }
    });
}, 20000); // Execute every 20 seconds
*/
module.exports = app;