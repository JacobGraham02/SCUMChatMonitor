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
const { EmbedBuilder } = require('discord.js');

const Queue = require('./utils/Queue');
const CheckTcpConnection = require('./utils/CheckTcpConnection');
/**
 * Modules and other files which are custom made for the application
 */
const hashAndValidatePassword = require('./modules/hashAndValidatePassword');
const UserRepository = require('./database/UserRepository');
const { discord_bot_token } = require('./config.json');
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

const tcpConnectionChecker = new CheckTcpConnection(process.env.scum_game_server_remote_address, process.env.scum_game_server_remote_port);

/** Each channel in a discord server is identified by a unique integer value
 */
const discord_chat_channel_bot_commands = '1125874103757328494';

const user_repository = new UserRepository();
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
const chat_log_messages_regex = /(?<=Global: |Local: |Admin: )\/[^\n]*[^'\n]/g;

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
let existing_cached_file_content_hash_login_log = '';
let existing_cached_file_content_hash_chat_log = '';

/**
 * last_line_processed_ftp_login_log stores a value which holds the number of lines in a file already processed. When a new line appears in the chat log, instead of
 * dealing with all commands in the current file, this variable will ensure only the lines after the specified line are acted upon
 */
let last_line_processed_ftp_login_log = 0;

let has_initial_line_been_processed_login_log = false;

/**
 * last_line_processed stores the last line processed as another safeguard so that only lines in the file after the specified one are executed
 */
let last_line_processed_ftp_chat_log = 0;

let has_initial_line_been_processed_chat_log = false;


const user_command_queue = new Queue();

const login_times = new Map();

const user_balance_updates = new Map();

/**
 * The below functions start the login and chat log intervals for the bot, and the check local server time intervals
 */

startFtpFileProcessingIntervalLoginLog();
startFtpFileProcessingIntervalChatLog();
startCheckLocalServerTimeInterval();
 
/**
 * This function loops through each of the strings located in the string array 'logs', and parses out various substrings to manipulate them.
 * 
 * @param {string[]} logs An array of strings that represents the contents of the FTP login file on gportal.  
 * */
async function determinePlayerLoginSessionMoney(logs) {

    if (!Array.isArray(logs)) {
        throw new Error('Invalid logs array');
    }

    for (const log of logs) {
        if (!log || log.includes("Game version: ")) {
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

                        console.log(`User ${user_steam_id} has an added account balance of ${user_account_balance}`);

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
            await user_repository.updateUserAccountBalance(user_steam_id, update);
            user_balance_updates.delete(user_steam_id);
        } catch (database_updated_error) {
            console.error(`Failed to update user account balance for user with steam id ${user_steam_id}`);
        }
    }
}

/**
 * This asynchronous function reads login log files from the FTP server hosted on GPortal for my SCUM server
 * The npm package 'FTP' provides functionality to process the data fetched from the GPortal FTP server and extract the relevant 
 * steam id of the invoker, and their associated in-game chat message
 * @param {Object} request An HTTP request object which attempts to query data from the FTP server
 * @param {any} response An HTTP response object which holds the query results obtained from the FTP server
 * @returns {Array} An array containing object(s) in the following format: {steam_id: string, player_message: string}
 */
async function readAndFormatGportalFtpServerLoginLog(request, response) {
    /**
    * If GPortal's FTP server does not respond within 30 seconds, throw an error indicating that the server cannot be reached
    */
    const ftp_timeout_milliseconds = 30000; 
    let ftp_client;
    try {
        ftp_client = new FTPClient();
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                ftp_client.end();
                reject(new Error('Connection to FTP server timed out'));
            }, ftp_timeout_milliseconds);

            ftp_client.on('ready', () => {
                clearTimeout(timeout);
                resolve();
            });
            ftp_client.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });

            ftp_client.connect(gportal_ftp_config);
        });

        const files = await new Promise((resolve, reject) => {
            ftp_client.list(gportal_ftp_server_target_directory, (error, files) => {
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

        const file_path = `${gportal_ftp_server_target_directory}${matching_files[0].name}`;

        const stream = await new Promise((resolve, reject) => {
            ftp_client.get(file_path, (error, stream) => {
                if (error) {
                    reject(`The file was present in gportal, but could not be fetched. ${error}`);
                } else {
                    resolve(stream);
                }
            });
        });

        let ftp_login_log_file_bulk_contents = '';
        let ftp_login_log_file_processed_contents_string_array;
        let received_chat_login_messages = [];
        let file_contents_steam_ids_array = [];
        let file_contents_steam_name_array = [];
        let file_contents_steam_ids;
        let file_contents_steam_messages;

        const user_steam_ids = {};

        await new Promise((resolve, reject) => {
            stream.on('data', (chunk) => {
                
                const processed_chunk = chunk.toString().replace(/\u0000/g, '');
                ftp_login_log_file_bulk_contents += processed_chunk;
                ftp_login_log_file_processed_contents_string_array = ftp_login_log_file_bulk_contents.split('\n');
                
                /**
                * Whenever the bot restarts, prevent duplicate older log files from being re-read and processed by the program. Set the first line to be processed as the total 
                * number of lines that currently exist in the FTP file. 
                */
                if (!has_initial_line_been_processed_login_log) {
                    last_line_processed_ftp_login_log = ftp_login_log_file_bulk_contents.length;
                }
                
                if (ftp_login_log_file_bulk_contents.length > 1) {
                    for (let i = last_line_processed_ftp_login_log; i < ftp_login_log_file_processed_contents_string_array.length; i++) {
                        received_chat_login_messages.push(ftp_login_log_file_processed_contents_string_array[i]);
                        /**
                         * When iterating through the stored strings, if any string exists that indicates a user has both left and joined the server, 
                         * append the user steam id into an array and call the function to get user money for the length of their session
                         */
                        if (ftp_login_log_file_processed_contents_string_array[i].match(login_log_steam_id_regex));
                            file_contents_steam_ids = ftp_login_log_file_processed_contents_string_array[i].match(login_log_steam_id_regex);
                            file_contents_steam_messages = ftp_login_log_file_processed_contents_string_array[i].match(login_log_steam_name_regex);

                            file_contents_steam_ids_array = Object.values(file_contents_steam_ids);
                            file_contents_steam_name_array = Object.values(file_contents_steam_messages);
                    }
                    for (let i = 0; i < file_contents_steam_ids_array.length; i++) {
                        user_steam_ids[file_contents_steam_ids_array[i]] = file_contents_steam_name_array[i];
                    }
                }
            });

            stream.on('end', () => {
                /**
                 * Set the last processed line of the old FTP login file so that we do not iterate over any already-processed lines in the FTP files
                 * After each process, hash the existing file so that the file is not read over again if it is the same
                 */
                last_line_processed_ftp_login_log = ftp_login_log_file_processed_contents_string_array.length;

                const current_file_contents_hash = crypto.createHash('md5').update(ftp_login_log_file_bulk_contents).digest('hex');
                
                if (current_file_contents_hash === existing_cached_file_content_hash_login_log) {
                    return;
                }
                existing_cached_file_content_hash_login_log = current_file_contents_hash; 

                has_initial_line_been_processed_login_log = true;

                /**
                 * Call each of the helper functions to perform specific actions and clear the old chat login messages array to maintain room for
                 * any future login messages
                 */
                determinePlayerLoginSessionMoney(received_chat_login_messages);

                insertSteamUsersIntoDatabase(Object.keys(user_steam_ids), Object.values(user_steam_ids));
        
                teleportNewPlayersToLocation(user_steam_ids);

                received_chat_login_messages = [];
              
                resolve();
            });
            stream.on('error', reject);
        });
    } catch (error) {
        console.log('Error processing login log file:', error);
        response.status(500).json({ error: 'Failed to process files' });
    } finally {
        if (ftp_client) {
            ftp_client.end();
        }   
    }
}
/**
 * This function determines if players joining the server are new. If so, they are teleported to a specific area on the map. 
 * The players are teleported to a specific area so they can read relevant server information. 
 * If the mongodb database results return a user who has the property 'user_joining_server_first_time' as a value of '0', a command will be executed
 * in-game that sends them to a specific location on the game map which tells them starter information they need to know
 * 
 * @param {any} online_users a Map containing the key-value pairs of user steam id and user steam name
 */
async function teleportNewPlayersToLocation(online_users) { 
    /**
     * Iterate over each key in the Map online_users. Each key in the Map is the steam id of the user
     */
    for (const key in online_users) {
        /**
         * Replacing the ' characters enclosing the string so we get a valid number
         */
        key.replace(/'/g, "");
        user_first_join_results = await user_repository.findUserByIdIfFirstServerJoin(key);
        if (user_first_join_results) {
            user_steam_id = user_first_join_results.user_steam_id;
            await sleep(40000);
            await enqueueCommand(`#Teleport -129023.125 -91330.055 36830.551 ${user_steam_id}`);
        }
        await user_repository.updateUser(key, { user_joining_server_first_time: 1 });
    }
}

/**
 * This asynchronous function reads chat log files from the FTP server hosted on GPortal for my SCUM server
 * The npm package 'FTP' provides functionality to process the data fetched from the GPortal FTP server and extract the relevant 
 * steam id of the invoker, and their associated in-game chat message
 * @param {Object} request An HTTP request object which attempts to query data from the FTP server
 * @param {any} response An HTTP response object which holds the query results obtained from the FTP server
 * @returns {Array} An array containing object(s) in the following format: {steam_id: string, player_message: string}
 */
async function readAndFormatGportalFtpServerChatLog(request, response) {
    let ftp_client;
    try {
        ftp_client = new FTPClient();

        /**
         * Attempt to establish a connection with the FTP server, and provide handlers to handle the result of the operation
         */
        await new Promise((resolve, reject) => {
            ftp_client.on('ready', resolve);
            ftp_client.on('error', reject);
            ftp_client.connect(gportal_ftp_config);
        });

        /**
         * Fetch a list of all the files in the specified directory on GPortal. In this instance, we fetch all of the files from
         * the path 'SCUM\\Saved\\SaveFiles\\Logs\\', which will give us access to the chat log file that we need
         */
        const files = await new Promise((resolve, reject) => {
            ftp_client.list(gportal_ftp_server_target_directory, (error, files) => {
                if (error) {
                    reject('Failed to retrieve file listing');
                } else {
                    resolve(files);
                }
            });
        });
        /**
         * Based on the log files that we obtained from querying the FTP server, we must filter the chat log files based on a filename prefix and 
         * sort by date. To obtain the chat logs, we must filter by the file name 'chat_'+most_recent_date', as the file name is 'chat_'+Date+'.log'
         * E.g. 'chat_202030831164431.log'
         */
        const matching_files = files
            .filter(file => file.name.startsWith(gportal_ftp_server_filename_prefix_chat))
            .sort((file_one, file_two) => file_two.date - file_one.date);

        /**
         * If no matching file names were found in the GPortal FTP server query result, we return a JSON response of an internal server error 
         * indicating that no target files were found
         */
        if (matching_files.length === 0) {
            response.status(500).json({ message: `No files were found that started with the prefix ${gportal_ftp_server_filename_prefix_chat}` });
            return;
        }

        /**
         * From the list of chat files retrieved with the date appended to the file name, fetch the file name with the most recent appended date
         */
        const file_path = `${gportal_ftp_server_target_directory}${matching_files[0].name}`;
        const stream = await new Promise((resolve, reject) => {
            ftp_client.get(file_path, (error, stream) => {
                if (error) {
                    reject(`The file was present in gportal, but could not be fetched. ${error}`);
                }
                else {
                    resolve(stream);
                }
            });
        });

        let file_contents_steam_id_and_messages = [];
        let received_chat_messages = [];
        let browser_file_contents_lines;

        /**
         * Process the incoming data stream from the FTP server query result and append individual data chunks prevent excessive memory usage
         * or potential memory leaks
         */
        await new Promise((resolve, reject) => {
            let browser_file_contents = '';
            stream.on('data', (chunk) => {

                /**
                 * Remove null characters from the incoming data streams and replace them with empty strings to avoid any null errors
                 */
                const processed_chunk = chunk.toString().replace(/\u0000/g, '');
                browser_file_contents += processed_chunk;

                /**
                 * Split the incoming data stream into individual lines so as to allow iteration over each of the lines individually
                 * This makes extracting any data much easier, or in some cases possible
                 */
                browser_file_contents_lines = browser_file_contents.split('\n');

                /**
                 * Whenever the bot restarts, prevent duplicate older log files from being re-read and processed by the program. Set the first line to be processed as the total 
                 * number of lines that currently exist in the FTP file. 
                 */
                if (!has_initial_line_been_processed_chat_log) {
                    last_line_processed_ftp_chat_log = browser_file_contents_lines.length;
                }

                if (browser_file_contents_lines.length > 1) {
                    for (let i = last_line_processed_ftp_chat_log; i < browser_file_contents_lines.length; i++) {
                        received_chat_messages.push(browser_file_contents_lines[i]);
                        /**
                         * When iterating through the stored strings, if any substring matches the regex patterns for user steam ids or user messages,
                         * append both the user steam id and user in-game message into an array which we will return
                         */
                        if (browser_file_contents_lines[i].match(chat_log_messages_regex)) {
                            file_contents_steam_id_and_messages.push({
                                key: browser_file_contents_lines[i].match(chat_log_steam_id_regex),
                                value: browser_file_contents_lines[i].match(chat_log_messages_regex)
                            });
                        }
                    }
                }
            });
            stream.on('end', () => {
                /**
                * Set the last line processed in the FTP file so that we do not re-read any file content which we have read already. This will assist administrators 
                * in keeping track of messages that have already been processed. 
                */
                last_line_processed_ftp_chat_log = browser_file_contents_lines.length;
                /**
                 * If a data stream from the FTP server was properly terminated and returned some results, we will create a hash of those results
                 * and will not execute the function again if subsequent hashes are identical. 
                 */
                if (browser_file_contents.length > 1) { 
                    const current_chat_log_file_hash = crypto.createHash('sha256').update(browser_file_contents).digest('hex');
                    if (current_chat_log_file_hash === existing_cached_file_content_hash_chat_log) {
                        return;
                    }
                    player_chat_messages_sent_inside_scum = received_chat_messages;
                    existing_cached_file_content_hash_chat_log = current_chat_log_file_hash;
                    has_initial_line_been_processed_chat_log = true;
                }
                resolve();
            });
            stream.on('error', reject);
        });

        return file_contents_steam_id_and_messages;

    } catch (error) {
        console.log('Error processing files:', error);
        response.status(500).json({ error: 'Failed to process files' });
    } finally {
        if (ftp_client) {
            ftp_client.end();
        }
        received_chat_messages = [];
    }
}

function startCheckLocalServerTimeInterval() {
    checkLocalServerTime = setInterval(checkLocalServerTime, 60000);
}

function stopCheckLocalServerTimeInterval() {
    clearInterval(checkLocalServerTime);
}

/**
 * This is the sequence of operations which executes after the server restarts, and the bot must log back into the server.
 * The program detects if the server has restarted by checking for a specific TCP connection to the game server. Because the game server on SCUM has a static IP address and port,
 * we can use the Windows command 'netstat -an' to check for existing connections on the computer and see if our target IP address exists in the list. 
 * await sleep(N) is an asynchronous operation used to block any further processing of this function until after N milliseconds.
 * You can convert milliseconds to seconds by dividing N / 1000 (80000 milliseconds / 1000 milliseconds = 8 seconds).
 * The SCUM game interface has a 'continue' button to join the server you were last on, so this operation moves to there. 
 */
async function reinitializeBotOnServer() {
    await sleep(10000);
    moveMouseToContinueButtonXYLocation();
    await sleep(80000);
    pressMouseLeftClickButton();
    await sleep(80000);
    pressCharacterKeyT();
    await sleep(5000);
    pressTabKey();
    await sleep(5000);
    await enqueueCommand('Wilson bot has been activated and is ready to use');
}

/**
 * Executes a Windows powershell command to simulate a user moving the cursor to a specific (X, Y) location on screen. This is an asynchronous operation.
 */
async function moveMouseToContinueButtonXYLocation() {
    const x_cursor_position = 476;
    const y_cursor_position = 589;
    const command = `powershell.exe -command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class P { [DllImport(\\"user32.dll\\")] public static extern bool SetCursorPos(int x, int y); }'; [P]::SetCursorPos(${x_cursor_position}, ${y_cursor_position})"`;
    exec(command, (error) => {
        if (error) {
            console.error(`Error moving the mouse the mouse to x 470, y 550 and left-clicking:${error}`);
        }
    });
}

/**
 * Executes a Windows powershell command to simulate a left mouse button click. This is as asynchronous operation.
 */
function pressMouseLeftClickButton() {
    const command = `powershell.exe -command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class P { [DllImport(\\"user32.dll\\")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo); }'; $leftDown = 0x0002; $leftUp = 0x0004; [P]::mouse_event($leftDown, 0, 0, 0, 0); [P]::mouse_event($leftUp, 0, 0, 0, 0);"`;
    exec(command, (error) => {
        if (error) {
            console.error(`Error when simulating a left click on the mouse`);
        } 
    });
}

/**
 * The function checkLocalServerTime runs once every minute, checking the current time relative to the time on the time clock on the target machine. Once the current time
 * fetched by the bot is 5:40 am, a warning message will be announced on the server informing users of a pending server restart in (6:00 - N), where N is the current time.
 * For example, if the current time is 5:40 am, 6:00 am - 5:40 am will result in 0:20. Therefore, the bot will announce on the server a restart in 20 minutes.
 * This occurs when the time is calculated as 20 minutes, 10 minutes, 5 minutes, and one minute. 
 */
async function checkLocalServerTime() {
    const currentDateTime = new Date();
    const current_hour = currentDateTime.getHours(); 

    if (current_hour === 5) {
        const current_minute = currentDateTime.getMinutes();
        const server_restart_messages = {
            40: 'Server restart in 20 minutes',
            50: 'Server restart in 10 minutes',
            55: 'Server restart in 5 minutes',
            59: 'Server restart in 1 minute'
        };

        if (server_restart_messages[current_minute]) {
            await enqueueCommand(`#Announce ${server_restart_messages[current_minute]}`);
        }
    }
}

/**
 * Start an interval of reading chat log messages from gportal which repeats every 10 seconds
 */
function startFtpFileProcessingIntervalChatLog() {
    read_login_ftp_file_interval = setInterval(handleIngameSCUMChatMessages, 10000);
}

/**
 * Start an interval of reading login log messages from gportal which repeats every 10 seconds
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
    const hashed_admin_user_password = hashAndValidatePassword.hashPassword(admin_user_password);

    user_repository.createAdminUser(admin_user_username, hashed_admin_user_password);
}
/**
 * Reads all of the documents from a specified collection in mongodb. 
 */
async function readSteamUsersFromDatabase() {
    user_repository.findAllUsers().then((results) => { console.log(results) });
}

/**
 * Inserts a specified steam user into the database along with their associated steam id
 * @param {any} steam_user_ids_array An array containing only 17-digit string representation of only digits 0-9
 * @param {any} steam_user_names_array An array containing only string representations of a steam username
 */
async function insertSteamUsersIntoDatabase(steam_user_ids_array, steam_user_names_array) {
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
 * The following function can be used for development or debugging purposes to find out if your system can identify when the SCUM game is running 
 */
function checkIfScumGameRunning(callback) {
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

/**
 * The discord API triggers an event called 'ready' when the discord bot is ready to respond to commands and other input. 
 */
client_instance.on('ready', () => {
    /**
     * previous_chat_message array holds previous chat messages so that messages are not repeated into the discord channel
     */
    let previous_chat_message = [];

    /**
     * Access the discord API channel cache for a specific guild (server) and fetch channels via their id
     */
    const discord_channel_id_for_heartbeat = '1146531098290028614';
    const discord_channel_id_for_scum_game = '1173048671420559521';
    const discord_channel_id_for_scum_chat = '1173100035135766539';
    const discord_channel_id_for_bot_in_game = '1173331877004845116';
    const discord_bot_in_scum_game_channel = client_instance.channels.cache.get(discord_channel_id_for_bot_in_game);
    const discord_heartbeat_channel = client_instance.channels.cache.get(discord_channel_id_for_heartbeat);
    const discord_scum_game_status = client_instance.channels.cache.get(discord_channel_id_for_scum_game);
    const discord_scum_game_ingame_messages_chat = client_instance.channels.cache.get(discord_channel_id_for_scum_chat);

    /**
     * A 30-second interval that reads all contents from the in-game SCUM server chat and uses the discord API EmbedBuilder to write a nicely-formatted chat message
     * into discord. This allows administrators to monitor the in-game SCUM chat remotely. Each time we enter this interval with the SCUM in-game chat logs, we will copy those
     * logs to another array, and compare that array to the next iteration of chat logs. 
     */
    setInterval(() => {
        checkIfScumGameRunning((isRunning) => {
            if (player_chat_messages_sent_inside_scum !== undefined) {
                if (!arraysEqual(previous_chat_message, player_chat_messages_sent_inside_scum)) {
                    // Messages have changed, send new messages
                    previous_chat_message = player_chat_messages_sent_inside_scum.slice(); // Copy the array
                    for (let i = 0; i < player_chat_messages_sent_inside_scum.length; i++) {
                        if (player_chat_messages_sent_inside_scum[i]) {
                            const embedded_message = new EmbedBuilder()
                                .setColor(0x299bcc)
                                .setTitle('SCUM In-game chat')
                                .setThumbnail('https://i.imgur.com/dYtjF3w.png')
                                .setDescription(`${player_chat_messages_sent_inside_scum[i]}`)
                                .setTimestamp()
                                .setFooter({ text: 'SCUM Bot Monitor', iconURL: 'https://i.imgur.com/dYtjF3w.png' });
                            discord_scum_game_ingame_messages_chat.send({ embeds: [embedded_message] });
                        }
                    }
                }
            }

            /**
             * A callback function from checkIfScumGameRunning is returned which checks to see if the SCUM game is currently running on the host machine. 
             * We use a callback function because the Node.js package 'exec' is asynchronous, but this program is synchronous. 
             */
            if (isRunning) {
                discord_scum_game_status.send('The SCUM game is running');
            } 
        });
    }, 60000);

    /**
     * A 5-minute interval which returns a callback function from a class which checks to see if the bot is connected to the SCUM game server.
     * This check is based on whether there is a TCP connection to the game server. This method is used because the bot is a regular .exe file on a computer,
     * and therefore can access all of the computer resources. 
     * We use a callback function because the Node.js package 'exec' is asynchronous, but this program is synchronous. 
     */
    setInterval(() => {
        tcpConnectionChecker.checkWindowsHasTcpConnectionToGameServer((game_connection_exists) => {
            if (game_connection_exists) {
                discord_bot_in_scum_game_channel.send('The bot has established a connection with the game server');
            } else {
                reinitializeBotOnServer();
            }
        });
    }, 300000);

    /**
     * A 1-minute interval which will send a message to the discord guild via the discord API to inform administrators that the bot is currently running on the 
     * target computer. 
     */
    setInterval(() => {
        if (discord_heartbeat_channel) {
            discord_heartbeat_channel.send('The bot is currently running');
        } else {
            console.log('An error has occurred - Please inform the bot developer that the specified discord channel could not be fetched');
        }
    }, 60000);

    /**
     * Inform administrators that the bot has successfully logged into the Discord guild
     */
    console.log(`The bot is logged in as ${client_instance.user.tag}`);
});

/**
 * Checks if the contents of arrayOne is equal arrayTwo, and the length of arrayOne is equal to arrayTwo
 * We only have to iterate over one array to check the contents of both because the arrays being equal naturally assumes that they are both the 
 * same length with the same contents
 * @param {Array} arrayOne
 * @param {Array} arrayTwo
 * @returns
 */
function arraysEqual(arrayOne, arrayTwo) { 
    if (arrayOne.length !== arrayTwo.length) {
        return false;
    }

    for (let i = 0; i < arrayOne.length; i++){
        if (arrayOne[i] !== arrayTwo[i]) return false;
    }
    return true;
}

function startCheckLocalServerTimeInterval() {
    checkLocalServerTime = setInterval(checkLocalServerTime, 60000);
}

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

    /**
     * If the command executed on Discord does not exist, immediately exit and do nothing
     */
    if (!command) {
        return;
    }

    /**
     * If the user executes a valid command on Discord, but the command was executed in the wrong channel, inform them of that
     * The correct channel is 'bot-commands'
     */
    if (!(determineIfUserMessageInCorrectChannel(interaction.channel.id, discord_chat_channel_bot_commands))) {
        await interaction.reply({ content: `You must use bot commands in the SCUM game server to execute them` });
        return;
    }

    /**
     * If the user has permission to execute a command on discord, attempt to execute that command. If they do not, inform them they do not have permission to use that command
     * In each command file in the 'commands' directory, there is an object property called 'authorization_role_name' that dictates the role a user must have to execute the command
     */
    if (determineIfUserCanUseCommand(interaction.member, command.authorization_role_name)) { 
        try {
            await command.execute(interaction);
        } catch (error) {
            await interaction.reply({ content: 'There was an error while executing this command! Please try again or contact a server administrator', ephermal: true });
        }
    } else {
        await interaction.reply({ content: `You do not have permission to execute the command ${command.data.name}. Contact a server administrator if you believe this is an error` });
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
    await sleep(1000);
    copyToClipboard(command);
    await sleep(1000);
    pressCharacterKeyT();
    await sleep(1000);
    pressBackspaceKey();
    await sleep(1000);
    pasteFromClipboard();
    await sleep(1000);
    pressEnterKey();
    await sleep(1000);
}

async function enqueueCommand(user_chat_message_object) {
    user_command_queue.enqueue(user_chat_message_object);
    await processQueue();
}

/**
 * This function is meant to catch any error that could occur in the program at run time and write those errors to a file, to allow
 * better debugging of the program when it crashes. 
 * @param {any} error any Error thrown by the application
 */
const logError = (error) => {
    const logFilePath = path.join(__dirname, 'error.log'); // Set the path for the error log file

    // Create or append to the error log file
    fs.appendFile(logFilePath, `${new Date().toISOString()}: ${error.stack}\n`, (err) => {
        if (err) {
            console.error('Error writing to error log:', err);
        }
    });

    // Log the error to the console
    console.error('Uncaught Exception or Unhandled Rejection:', error);
};

// Attach the error handler
process.on('uncaughtException', logError);
process.on('unhandledRejection', (reason, promise) => {
    logError(new Error(`Unhandled Rejection at: ${promise}, reason: ${reason}`));
});

// Optionally, listen for the process to exit gracefully
process.on('exit', (code) => {
    console.log(`Process exited with code ${code}`);
});


/**
 * This function iterates through all of the SCUM in-game chat messages starting with '!' recorded into the gportal chat log into a queue in preparation 
 * for sequential execution.
 */
async function handleIngameSCUMChatMessages() {
    /**
     * Fetch the data from the resolved promise returned by readAndFormatGportalFtpServerChatLog. This contains all of the chat messages said on the server. 
     */
    const ftp_server_chat_log = await readAndFormatGportalFtpServerChatLog();
    /**
     * If the chat log returns a falsy value, immediately return
     */
    if (!ftp_server_chat_log) {
        return;
    } 
    
    /**
     * For each command that has been extracted from the chat log, place the command in a queue for execution
     */
    for (let i = 0; i < ftp_server_chat_log.length; i++) {
        console.log(ftp_server_chat_log[i]);
        await enqueueCommand(ftp_server_chat_log[i]);
    }
}
async function processQueue() {
    while (user_command_queue.length() > 0) { 
        /**
         * After a command has finished execution in the queue, shift the values one spot to remove the command which has been executed. Extract the command 
         * and the steam id of the user who executed the command
         */
        const user_chat_message_object = user_command_queue.dequeue();
        
        if (user_chat_message_object.value === undefined) { 
            continue;
        }

        const command_to_execute = user_chat_message_object.value[0].substring(1);
        const command_to_execute_player_steam_id = user_chat_message_object.key[0];

        /**
         * If a command that matches a command inside of the queue cannot be found, skip over the command and continue onto the next command
         */
        if (!client_instance.commands.get(command_to_execute)) {
            continue;
        }

        /**
         * Fetch the user from the database with an id that corresponds with the one associated with the executed command. After, fetch all of properties and data from the user and command
         * that is relevant
         */
        const user_account = await user_repository.findUserById(command_to_execute_player_steam_id);
        const user_account_balance = user_account.user_money;
        const function_property_data = client_instance.commands.get(command_to_execute)(user_account);
        const client_command_data = function_property_data.command_data;
        const client_command_data_cost = function_property_data.command_cost;

        /**
         * Remove the weird (0-9{1,4}) value which is appended onto each username in the GPortal chat log. 
         * The GPortal chat log generates usernames like: jacobdgraham02(102). Therefore, we will use regex to replace that with: jacobdgraham02
         */
        const client_ingame_chat_name = user_account.user_steam_name.replace(/\([0-9]{1,4}\)/g, '');           

        /**
         * All of the other commands just deduct money from the user account when executed. The command '!welcomepack' is special because it can be executed multiple times, increasing
         * in cost by 5000 after each execution. In the database class, there is a trigger defined for the user_welcome_pack_cost field that increments by 5000 each time it detects
         * an increment by 1 for the field 'user_welcome_pack_uses'. Each time this command is executed, we update the user welcome pack uses by one. 
         */
        if (command_to_execute === 'welcomepack') {
            const welcome_pack_cost = user_account.user_welcome_pack_cost;
             if (user_account_balance < welcome_pack_cost) {
                 await enqueueCommand(`${client_ingame_chat_name} you do not have enough money to use your welcome pack again. Use the command /balance to check your balance`);
                 continue;
             } else {
                 const user_account_for_welcome_pack = await user_repository.findUserById(command_to_execute_player_steam_id);
                 await user_repository.updateUserWelcomePackUsesByOne(user_account.user_steam_id);
                 await user_repository.updateUserAccountBalance(command_to_execute_player_steam_id, -user_account_for_welcome_pack.user_welcome_pack_cost);
             }
        }

        if (user_account_balance < function_property_data.command_cost) {
            console.log(`${client_ingame_chat_name}, you do not have enough money to use this package. Use the command /balance to check your balance.`);
            continue;
        }
        /**
         * If the cost to execute the command does not equal undefined, subtract the balance of the package from the user's balance 
         */
        if (!(client_command_data_cost === undefined)) {
            await user_repository.updateUserAccountBalance(command_to_execute_player_steam_id, -client_command_data_cost);
        }

        /**
         * Open the chat menu by pressing the 'T' key. If the chat is already open, press the 'Backspace key to get rid of the hanging 'T' character
         */
        for (let i = 0; i < client_command_data.length; i++) {
            await runCommand(client_command_data[i]);
        } 
    }
}

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

module.exports = app;