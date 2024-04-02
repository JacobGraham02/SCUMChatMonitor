import { config } from 'dotenv';
config({ path: '.env' });


/**
 * Nodejs and express specific dependencies
 */
import createError from 'http-errors';
import express from 'express';
import path from 'path';
import { dirname} from 'path'
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import session from 'express-session';
import crypto from 'crypto';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { exec } from 'child_process';
import fs from 'fs';
import FTPClient from 'ftp';
import MongoStore from 'connect-mongo';
import { Client, Collection, GatewayIntentBits, REST, Routes, Events, ChannelType } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import myEmitter from './utils/EventEmitter.js'
import Queue from './utils/Queue.js'
import Logger from './utils/Logger.js';
import ServerInfoCommand from './api/battlemetrics/ServerInfoCommand.js';
import CheckTcpConnection from './utils/CheckTcpConnection.js';
import { hashPassword, validatePassword } from './modules/hashAndValidatePassword.js';
import UserRepository from './database/MongoDb/UserRepository.js';
import BotRepository from './database/MongoDb/BotRepository.js';
import { Mutex } from 'async-mutex';
import indexRouter from './routes/index.js';
import adminRouter from './routes/admin.js';
import apiExecutableRecompilation from './api/recompile/recompile-executable.js';
import PlayerInfoCommand from './api/ipapi/PlayerInfoCommand.js';
import SteamUserInfoCommand from './api/steam/SteamUserInfoCommand.js';
import { E_CANCELED } from 'async-mutex';
import { fileURLToPath, pathToFileURL } from 'url';
// import { createClient } from 'redis'
import { promisify } from 'util';

const bot_token = process.env.discord_wilson_bot_token;
// const redis_cache_host_name = process.env.azure_cache_for_redis_host_name;
// const redis_cache_password = process.env.azure_cache_for_redis_access_key;

// const redis_client = createClient({
//     url: `rediss://${redis_cache_host_name}:6380`,
//     password: redis_cache_password,
// }); 

// await redis_client.connect();

// const getAsync = promisify(redis_client.get).bind(redis_client);

// const setAsync = promisify(redis_client.set).bind(redis_client);

// redis_client.on('connect', () => {
//     console.log(`The Azure Redis server has been initialized`);
// });

// redis_client.on('error', (error) => {
//     console.log(`Redis client error: ${error}`);
// });

const client_instance = new Client({
    intents: [GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    ]
});

/** Each channel in a discord server is identified by a unique integer value
 */
const discord_chat_channel_bot_commands = '1125874103757328494';

const user_repository = new UserRepository();
const bot_repository = new BotRepository();
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
 * The following regex string is to identify and extract the ipv4 address from gportal's ftp log files.
 * An example message will look like the following: 2023.12.19-17.18.57: '72.140.43.39 76561198244922296:jacobdgraham02(2)' logged in at: X=218481.953 Y=243331.516 Z=28960.289
 * We want to extract only the substring '72.140.43.39' 
 */
const ipv4_address_regex = /'((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}/g;

/**
 * The below commented out regex string matches all of the chat log messages sent by the chat bot, Wilson. This regex string can be used to keep track of Wilson. 
 * const chat_log_messages_from_wilson_regex = /('76561199505530387:Wilson\24\' '?:Local|Global|Admin:.*)'/g; 
 */

/**
 * The following regex string is for chat messages when they appear in the chat log file. 
 */
const chat_log_messages_regex = /(?<=Global: |Local: |Admin: |Squad: )\/[^\n]*[^'\n]/g;

/**
 * The following 3 strings must be hardcoded according to how the gportal ftp server is structured. The use of 2 \\ characters is necessary to equal one \ character
 */
const gportal_ftp_server_target_directory = 'SCUM\\Saved\\SaveFiles\\Logs\\';
const gportal_ftp_server_filename_prefix_login = 'login_';
const gportal_ftp_server_filename_prefix_chat = 'chat_';

const mutex = new Mutex();

/**
 * GPortal FTP server credentials with a timeout time of 60 seconds in case the server is busy or slow. 
 */
const gportal_ftp_config = {
    host: process.env.gportal_ftp_hostname,
    port: process.env.gportal_ftp_hostname_port,
    user: process.env.gportal_ftp_username,
    password: process.env.gportal_ftp_password,
    connTimeout: 600000,
    keepAlive: 10000
};

let gportal_log_file_ftp_client = undefined;

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

const gportal_ftp_server_log_interval_seconds = {
    "10": 10000,
    "15": 15000,
    "20": 20000,
    "30": 30000,
    "45": 45000,
    "60": 60000,
    "300": 300000
}

/**
* This Queue holds all of the user commands, queued in order so that users have their commands executed at the desired time
*/
const user_command_queue = new Queue();

/** 
* Traditional logging system to log errors and other messages
*/
const message_logger = new Logger();

/**
 * A class instance which holds a function that hits the Battlemetrics server API
 */
const battlemetrics_server_info = new ServerInfoCommand(process.env.battlemetrics_server_id);

const ipApi_player_info = new PlayerInfoCommand();

const steam_web_api_player_info = new SteamUserInfoCommand(process.env.steam_web_api_key);

/** 
* Injects variables into the class to add functionality in checking the SCUM game server and GPortal, where the game server is hosted
*/
const tcpConnectionChecker = new CheckTcpConnection(process.env.scum_game_server_address, process.env.scum_game_server_port, message_logger);

/**
* A Map which holds all of the login times of the users, so that the amount of bot money they get per login session is correctly calculated and applied  
*/
const login_times = new Map();

/**
* A Map which holds all of the user balances for the users which need to have their bot money account balance updated 
*/
const user_balance_updates = new Map();

/**
* An array which holds all of the player log in / log out messages and records them in discord for logging and administrative purposes 
*/
let player_ftp_log_login_messages = [];

/**
* An array which holds all of the player messages sent in chat and records them in discord for logging and administrative purposes
*/
let player_chat_messages_sent_inside_scum = [];

/**
 * An array which acts as a cache to hold previous player chat messages. This array is used to compare with any new player chat message array because both GPortal and SCUM lack any 
 * capabilities in terms of data management for FTP. This array is assigned a new value each time the chat log FTP file is read.
 */
let previous_player_chat_messages = [];

/**
 * An array which acts as a cache to hold previous player login messages. This array is used to compare with any new player login array because both GPortal and SCUM lack any 
 * capabilities in terms of data management for FTP. This array is assigned a new value each time the login FTP file is read. 
 */
let previous_player_login_messages = [];

/**
 * An array which acts as a cache to hold previous player ipv4 addresses. This array is assigned a new value each time the login FTP file is read, as the IP addresses are acquired through
 * the SCUM log in FTP files.
 */
let previous_player_ipv4_addresses = [];

/**
 * An array which acts as a cache to hold current player ipv4 addresses. This array is assigned a new value each time the login FTP file is read, as the IP addresses are acquired through
 * the SCUM log in FTP files.
 */
let player_ipv4_addresses = [];

/**
 * A placeholder object to hold multiple player steam ids in one structure. Both GPortal and SCUM lack any data processing capabilities, so I have to use workarounds to capture
 * relevant data
 */
let user_steam_ids = {};

/**
 * A placeholder object to hold one player steam id in one structure. Both GPortal and SCUM lack any data processing capabilities, so I have to use workarounds to capture
 * relevant data
 */
let user_steam_id = {};

/**
 * Global boolean variable defining if the bot is having any errors or not
 */
let gportal_ftp_connection_issue = true;

let check_local_server_time_interval;

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

                        message_logger.logMessage(`User ${user_steam_id} has an added account balance of ${user_account_balance}`);

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
            message_logger.logError(`Failed to update user account balance for user with steam id: ${user_steam_id}`);
        }
    }
}

/*
These variables are used when attempting to connect to the GPortal FTP server. The general strategy used is to have increasing increments of time waited each
time the FTP connection is severed. The first connection attempt is 5 seconds. Any subsequent connection attempts will have an increase in 5 seconds added onto
the total connection attempt wait time. 
1 try = 5 seconds
2 tries = 10 seconds
3 tries = 15 seconds
...
x tries = x * 5 seconds

retryCount is used to indicate how many times the ftp connection has attempted to reconnect
maxRetries is used to indicate the maximum number of retry attempts that will be performed before the connection attempts to GPortal are halted 
retryDelay is used to indicate how many milliseconds to wait before attempting to establish a new connection
*/
let retryCount = 0;
const maxRetries = 5; // Maximum number of retry attempts
const retryDelay = 5000; // Initial delay between retries in milliseconds

/**
 * These variables are used when attempting to connect to the GPortal FTP server. The general strategy used is to have increasing increments of time waited each
time the FTP connection is severed. The first connection attempt is 5 seconds. Any subsequent connection attempts will have an increase in 5 seconds added onto
the total connection attempt wait time. 
1 try = 5 seconds
2 tries = 10 seconds
3 tries = 15 seconds
...
x tries = x * 5 seconds

retryCount is used to indicate how many times the ftp connection has attempted to reconnect
maxRetries is used to indicate the maximum number of retry attempts that will be performed before the connection attempts to GPortal are halted 
retryDelay is used to indicate how many milliseconds to wait before attempting to establish a new connection
 * @returns nothing if an FTP connection cannot be made to GPortal within 5 attempts
 */
async function establishFtpConnectionToGportal() {
    gportal_log_file_ftp_client = new FTPClient();
    gportal_log_file_ftp_client.removeAllListeners();
    
    gportal_log_file_ftp_client.addListener('close', () => {
        console.log('FTP connection closed. Attempting to reconnect...');
        message_logger.logError(`FTP connection closed. Attempting to reconnect...`);
        retryConnection();
    });

    await new Promise((resolve, reject) => {
        gportal_log_file_ftp_client.on('ready', () => {
            console.log('FTP connection successfully established.');
            message_logger.logError(`FTP connection successfully established.`);
            gportal_ftp_connection_issue = true;
            retryCount = 0; 
            resolve();
        });
        gportal_log_file_ftp_client.on('error', (error) => {
            console.error(`FTP connection error: ${error.message}`);
            message_logger.logError(`FTP connection error: ${error.message}`);
            reject(error); 
        });
        gportal_log_file_ftp_client.connect(gportal_ftp_config);
    }).catch(error => {
        console.log('An error occurred, attempting to retry connection...');
        message_logger.logError(`Retrying connection in ${delay / 1000} seconds...`);
        retryConnection();
    });
}

/**
 * Attempts to reconnect to the GPortal FTP server when the connection is severed. Used in conjunction with the @establishFtpConnectionToGportal function
 */
function retryConnection() {
    retryCount++;
    const delay = retryDelay * retryCount; 
    message_logger.logError(`Retrying connection in ${delay / 1000} seconds...`);
    setTimeout(establishFtpConnectionToGportal, delay);
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
    try {
        const files = await new Promise((resolve, reject) => {
            gportal_log_file_ftp_client.list(gportal_ftp_server_target_directory, (error, files) => {
                if (error) {
                    message_logger.logError('Error retrieving file listing:', error);
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
            message_logger.logError(`No files were found that started with the prefix ${gportal_ftp_server_filename_prefix_login}: ${error}`);
            response.status(500).json({ message: `No files were found that started with the prefix ${gportal_ftp_server_filename_prefix_login}` });
            gportal_log_file_ftp_client.end();
            return;
        }

        const file_path = `${gportal_ftp_server_target_directory}${matching_files[0].name}`;

        const stream = await new Promise((resolve, reject) => {
            gportal_log_file_ftp_client.get(file_path, (error, stream) => {
                if (error) {
                    message_logger.logError(`The ftp login file was present in GPortal, but could not be fetched: ${error}`);
                    reject(new Error(`The ftp login file was present in GPortal, but could not be fetched. ${error}`));
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

                if (player_ipv4_addresses.length >= 1) {
                    player_ipv4_addresses = [];
                }
                
                if (ftp_login_log_file_bulk_contents.length > 1) {
                    for (let i = last_line_processed_ftp_login_log; i < ftp_login_log_file_processed_contents_string_array.length; i++) {
                        received_chat_login_messages.push(ftp_login_log_file_processed_contents_string_array[i]);
                        /**
                         * We must remove the first character of the ipv4 address because it is the ' character, which will not work for an address
                         */
                        player_ipv4_addresses.push(ftp_login_log_file_processed_contents_string_array[i].match(ipv4_address_regex)[0].substring(1));
                        
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
                    scum_ftp_log_login_messages = received_chat_login_messages;
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
                player_ftp_log_login_messages = received_chat_login_messages;
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
        message_logger.logError(`Error processing the GPortal FTP login log file: ${error}`);
        response.status(500).json({ error: 'Failed to process files' });
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
        /*
        Only find a user in the MongoDB database if they have not yet joined the server (i.e. with the property 'user_joining_server_first_time' equal to 0)
        After a user joins the server, that property is updated to contain a value of '1'
        */
        user_first_join_results = await user_repository.findUserByIdIfFirstServerJoin(key);
        if (user_first_join_results) {
            user_steam_id = user_first_join_results.user_steam_id;
            
            try {
                myEmitter.emit('newUserJoinedServer', user_steam_id);
                await sendNewPlayerLoginMessagesToDiscord(player_ipv4_addresses, user_steam_id, discord_scum_game_first_time_logins_chat);
            } catch (error) {
                console.error(`An error has occurred sending the new player login messages to discord: ${error}`);
            }

            await sleep(60000);

            try {
                await enqueueCommand(`#Teleport -129023.125 -91330.055 36830.551 ${user_steam_id}`);
            } catch (error) {
                console.error(`An error has occurred when attempting to teleport the player to the spawn location area: ${error}`);
            }
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
    try {
        /**
         * Fetch a list of all the files in the specified directory on GPortal. In this instance, we fetch all of the files from
         * the path 'SCUM\\Saved\\SaveFiles\\Logs\\', which will give us access to the chat log file that we need
         */
        const files = await new Promise((resolve, reject) => {
            gportal_log_file_ftp_client.list(gportal_ftp_server_target_directory, (error, files) => {
                if (error) {
                    message_logger.logError(`Failed to retrieve file listings from GPortal: ${error.message}`);
                    reject(new Error(`Failed to retrieve file listings: ${error.message}`));
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
            message_logger.logError(`No files were found that started with the prefix ${gportal_ftp_server_filename_prefix_chat}: ${error}`);
            response.status(500).json({ message: `No files were found that started with the prefix ${gportal_ftp_server_filename_prefix_chat}` });
            return;
        }

        /**
         * From the list of chat files retrieved with the date appended to the file name, fetch the file name with the most recent appended date
         */
        const file_path = `${gportal_ftp_server_target_directory}${matching_files[0].name}`;
        const stream = await new Promise((resolve, reject) => {
            gportal_log_file_ftp_client.get(file_path, (error, stream) => {
                if (error) {
                    message_logger.logError(`The file is present in GPortal, but can not be fetched: ${error} `);
                    reject(new Error(`The file was present in gportal, but could not be fetched: ${error}`));
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
            stream.on('error', (error) => {
                message_logger.logError(`Steam error: ${error.message}`);
                reject(new Error(`Stream error: ${error.message}`));
            });
        });

        if (file_contents_steam_id_and_messages) {
            return file_contents_steam_id_and_messages;
        }

    } catch (error) {
        message_logger.logError(`Error when processing the SCUM chat log files: ${error}`);
        response.status(500).json({ error: 'Failed to process files' });
    } finally {
        received_chat_messages = [];
    }
}

function startCheckLocalServerTimeInterval() {
    if (typeof check_local_server_time_interval !== undefined) {
        clearInterval(check_local_server_time_interval);
    }
    check_local_server_time_interval = setInterval(checkLocalServerTime, gportal_ftp_server_log_interval_seconds["60"]);
}

function stopCheckLocalServerTimeInterval() {
    clearInterval(check_local_server_time_interval);
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
    message_logger.logMessage(`The bot is offline. Attempting to log the bot back into the server`);
    await sleep(5000);
    moveMouseToPressOkForMessage();
    await sleep(100000);
    pressMouseLeftClickButton();
    await sleep(5000);
    moveMouseToContinueButtonXYLocation();
    await sleep(10000);
    pressMouseLeftClickButton();
    await sleep(20000);
    pressCharacterKeyT();
    await sleep(20000);
    pressTabKey();
    await sleep(5000);
    message_logger.logMessage(`Wilson bot has been activated and is ready to use`);
    await sleep(5000);
    await enqueueCommand('Wilson bot has been activated and is ready to use');
}

/**
 * Executes a Windows powershell command to simulate a user moving the cursor to a specific (X, Y) location on screen. This is an asynchronous operation.
 */
async function moveMouseToContinueButtonXYLocation() {
    const x_cursor_position = 466;
    const y_cursor_position = 619;
    const command = `powershell.exe -command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class P { [DllImport(\\"user32.dll\\")] public static extern bool SetCursorPos(int x, int y); }'; [P]::SetCursorPos(${x_cursor_position}, ${y_cursor_position})"`;
    exec(command, (error) => {
        if (error) {
            message_logger.logError(`Error when moving the mouse to x 470 and y 550: ${error}`);
        }
    });
}

/**
 * Executes a Windows powershell command to simulate a user moving the cursor to a specific (X, Y) location on screen. This is an asynchronous operation.
 */
async function moveMouseToPressOkForMessage() {
    const x_cursor_position = 958;
    const y_cursor_position = 536;
    const command = `powershell.exe -command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class P { [DllImport(\\"user32.dll\\")] public static extern bool SetCursorPos(int x, int y); }'; [P]::SetCursorPos(${x_cursor_position}, ${y_cursor_position})"`;
    exec(command, (error) => {
        if (error) {
            message_logger.logError(`Error when moving the mouse to x 470 and y 550: ${error}`);
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
            message_logger.logError(`Error when left clicking the mouse: ${error}`);
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

    if (current_hour === 5 || current_hour === 18) {
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
 * Start an interval of reading chat log messages from gportal which repeats every 15 seconds. Clear any previously-set intervals
 */
function startFtpFileProcessingIntervalChatLog() {
    if (typeof chat_log_ftp_file_interval !== 'undefined') {
        return;
    }
    chat_log_ftp_file_interval = setInterval(handleIngameSCUMChatMessages, gportal_ftp_server_log_interval_seconds["15"]);
}

/**
 * Start an interval of reading login log messages from gportal which repeats every 15 seconds. Clear any previously-set intervals
 */
function startFtpFileProcessingIntervalLoginLog() {
    if (typeof read_login_ftp_file_interval !== 'undefined') {
        return;
    }
    read_login_ftp_file_interval = setInterval(readAndFormatGportalFtpServerLoginLog, gportal_ftp_server_log_interval_seconds["15"]);
}

/**
 * Terminate any existing intervals for the GPortal FTP server login file
 */
function stopFileProcessingIntervalLoginLog() {
    clearInterval(chat_log_ftp_file_interval);
}

/**
 * Terminate any existing intervals for the GPortal FTP server in-game chat file
 */
function stopFileProcessingIntervalChatLog() {
    clearInterval(read_login_ftp_file_interval);
}

/**
 * Inserts a document into the mongodb collection 'Administrators'. These users are the only ones who can access the bot web interface.
 * The admin username is passed in plain text (Effective July 09, 2023) and will be hashed at a later date. 
 * The admin password is both hashed and salted.
 * @param {string} admin_user_username A string representation of the data submitted on the login form
 * @param {string} admin_user_password A string representation of the data submitted on the login form
 * @param {UUID} admin_bot_token A UUID that represents the bot that the user is associated with
 */
function insertAdminUserIntoDatabase(admin_user_username, admin_user_password, admin_bot_token) {
    const hashed_admin_user_password = hashAndValidatePassword.hashPassword(admin_user_password);

    user_repository.createAdminUser(admin_user_username, hashed_admin_user_password, admin_bot_token);
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
const verifyCredentialsCallback = async (email, password, done) => {
    let bot_user_data = undefined;
    try {
        bot_user_data = await bot_repository.getBotDataByEmail(email);
    } catch (error) {
        console.error(`An error has occurred when attempting to verify that your log in. Please contact the server administrator with the following error: ${error}`);
        throw new Error(`An error has occurred when attempting to verify that your log in. Please contact the server administrator with the following error: ${error}`);
    }
    if (!bot_user_data) {
        console.log(`No user with this login exists`);
        return done(null, false);
    }
    const bot_user_email = bot_user_data.bot_email;
    const bot_user_username = bot_user_data.bot_username;
    const bot_user_password = bot_user_data.bot_password;
    const bot_user_salt = bot_user_data.bot_salt;
    const bot_user_guild_id = bot_user_data.guild_id;
    const bot_user_ftp_server_ipv4 = bot_user_data.ftp_server_ip;
    const bot_user_ftp_server_port = bot_user_data.ftp_server_port;
    const bot_user_ftp_server_username = bot_user_data.ftp_server_username;
    const bot_user_ftp_server_password = bot_user_data.ftp_server_password;
    const bot_user_game_server_ipv4 = bot_user_data.game_server_ipv4_address;
    const bot_user_game_server_port = bot_user_data.game_server_port;
    const bot_user_ingame_chat_channel_id = bot_user_data.scum_ingame_chat_channel_id;
    const bot_user_ingame_logins_channel_id = bot_user_data.scum_ingame_logins_channel_id;
    const bot_user_new_player_joins_channel_id = bot_user_data.scum_new_player_joins_channel_id;
    const bot_user_battlemetrics_channel_id = bot_user_data.scum_battlemetrics_server_id;
    const bot_user_server_info_channel_id = bot_user_data.scum_server_info_channel_id;

    const valid_user_account = validatePassword(password, bot_user_password, bot_user_salt);

    const user = {
        username: bot_user_username,
        email: bot_user_email,
        guild_id: bot_user_guild_id,
        ftp_server_ipv4: bot_user_ftp_server_ipv4,
        ftp_server_port: bot_user_ftp_server_port,
        ftp_server_username: bot_user_ftp_server_username,
        ftp_server_password: bot_user_ftp_server_password,
        game_server_ipv4: bot_user_game_server_ipv4,
        game_server_port: bot_user_game_server_port,
        ingame_chat_channel_id: bot_user_ingame_chat_channel_id,
        ingame_logins_channel_id: bot_user_ingame_logins_channel_id,
        new_player_joins_channel_id: bot_user_new_player_joins_channel_id,
        battlemetrics_channel_id: bot_user_battlemetrics_channel_id,
        server_info_channel_id: bot_user_server_info_channel_id
    };

    if (valid_user_account) {
        return done(null, user);
    } else {
        return done(null, false);
    }
}

// view engine setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/admin', adminRouter);
app.use('/api/', apiExecutableRecompilation);

app.post('/login', passport.authenticate('local', {
    successRedirect: 'admin/login-success',
    failureRedirect: 'login-failure'
}));

app.get('/login-failure', function (request, response, next) {
    response.render('login', {
        title: "Invalid login", invalid_login_message: 'Invalid login credentials. Please try again with a different set of credentials.'
    });
});

const passportLoginStrategy = new LocalStrategy({
    usernameField: "email",
    passwordField: "password"
}, verifyCredentialsCallback);

passport.use(passportLoginStrategy);

passport.serializeUser(function (user, done) {
    done(null, user.guild_id);
});

// passport.deserializeUser(async (guildId, done) => {
//     const userCacheKey = `user:${guildId}`;
//     try {
//         // Attempt to retrieve user data from cache with a timeout
//         const cachedUserData = await withTimeout(getAsync(userCacheKey), 5000); // Timeout after 5000ms

//         if (cachedUserData) {
//             const user = JSON.parse(cachedUserData);
//             return done(null, user);
//         }

//         // User data not found in cache, retrieve from repository
//         const repositoryUser = await bot_repository.getBotDataByGuildId(guildId);

//         if (repositoryUser) {
//             // User data found in repository, store in cache and return
//             await withTimeout(setAsync(userCacheKey, JSON.stringify(repositoryUser), 'EX', 60 * 60), 5000); // Timeout after 5000ms
//             return done(null, repositoryUser);
//         } else {
//             // User not found in repository, return false
//             return done(null, false);
//         }
//     } catch (error) {
//         console.error(`Error in deserializeUser for guildId ${guildId}: ${error}`);
//         return done(error, null);
//     }
// });

passport.deserializeUser(async (guildId, done) => {
    let repository_user = undefined;
    try {
        repository_user = await bot_repository.getBotDataByGuildId(guildId);

        if (repository_user) {
            return done(null, repository_user);
        } else {
            return done(null, false);
        }
    } catch (error) {
        done(error, null);
        throw new Error(`Error in deserializeUser for guildId ${guildId}: ${error}`)
    }
});

async function updateBotUserCache(guildId, newData) {
    let new_data = undefined;
    let serialized_data = undefined;

    try {
        await bot_repository.updateBotDataByGuildId(guildId, newData);
        
        const cache_key = `user:${guildId}`;
        const transaction = redis_client.multi();
        
        if (typeof new_data === 'object') {
            serialized_data = JSON.stringify(new_data);
        } else {
            serialized_data = new_data;
        }

        transaction
            .del(cache_key)
            .set(cache_key, serialized_data);

        await promisify(transaction.exec).bind(transaction)();
    } catch (error) {
        throw new Error(`Error updating user cache: ${error.message}`);
    }
}



/**
 * Creates a 404 error when the application tries to navigate to a non-existent page.
 */
app.use(function (req, res, next) {
    next(createError(404));
});

app.listen(process.env.port, function () {
    console.log(`Server is running on port ${process.env.port}`);
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

function sendPlayerMessagesToDiscord(discord_scum_game_chat_messages, discord_channel) {
    if (discord_scum_game_chat_messages === undefined) {
        message_logger.logError(`The scum in game chat messages could not be fetched and are undefined`);
        return;
    };

    if (discord_channel === undefined) {
        message_logger.logError(`The Discord channel for logging player chat messages could not be reached and is undefined`);
        return;
    };

    if (discord_scum_game_chat_messages !== undefined) {
        if (!arraysEqual(previous_player_chat_messages, discord_scum_game_chat_messages)) {
            previous_player_chat_messages = discord_scum_game_chat_messages.slice();
        /*
        * If the previous chat messages and the new chat messages have not changed, we do not need to process the chat log over again
        */ 
            for (let i = 0; i < discord_scum_game_chat_messages.length; i++) {
                const embedded_message = new EmbedBuilder()
                    .setColor(0x299bcc)
                    .setTitle('SCUM In-game chat')
                    .setThumbnail('https://i.imgur.com/dYtjF3w.png')
                    .setDescription(`${discord_scum_game_chat_messages[i]}`)
                    .setTimestamp()
                    .setFooter({ text: 'SCUM Bot Monitor', iconURL: 'https://i.imgur.com/dYtjF3w.png' });
                discord_channel.send({ embeds: [embedded_message] });
            }
        }
    }
}

function sendPlayerLoginMessagesToDiscord(discord_scum_game_login_messages, discord_channel) {
    if (discord_scum_game_login_messages === undefined) {
        message_logger.logError(`The scum in game log in messages could not be fetched and are undefined`);
        return;
    };

    if (discord_channel === undefined) {
        message_logger.logError(`The Discord channel for logging player logins could not be reached and is undefined`);
        return;
    };

    if (discord_scum_game_login_messages !== undefined) {
        if (!arraysEqual(previous_player_login_messages, discord_scum_game_login_messages)) {
            previous_player_login_messages = discord_scum_game_login_messages.slice();
        /*
        * If the previous login log messages and the new login log messages have not changed, we do not need to process the login log over again
        */ 
            for (let i = 0; i < discord_scum_game_login_messages.length; i++) { 
                const embedded_message = new EmbedBuilder()
                    .setColor(0x299bcc)
                    .setTitle('SCUM login information')
                    .setThumbnail('https://i.imgur.com/dYtjF3w.png')
                    .setDescription(`${discord_scum_game_login_messages[i]}`)
                    .setTimestamp()
                    .setFooter({ text: 'SCUM Bot Monitor', iconURL: 'https://i.imgur.com/dYtjF3w.png' });
                discord_channel.send({ embeds: [embedded_message] });
            }
        }
    }
}

async function sendNewPlayerLoginMessagesToDiscord(player_ipv4_addresses, user_steam_id, discord_channel) {
    if (player_ipv4_addresses === undefined) {
        message_logger.logError(`The SCUM log in messages could not be fetched and are undefined`);
        return;
    };
    if (discord_channel === undefined) {
        message_logger.logError(`The Discord channel for logging new player log in messages could not be fetched and is undefined`);
        return;
    }
    if (player_ipv4_addresses !== undefined) {
        if (!arraysEqual(previous_player_ipv4_addresses, player_ipv4_addresses)) {
            previous_player_ipv4_addresses = player_ipv4_addresses.slice();
        /*
        * If the previous login log messages and the new login log messages have not changed, we do not need to process the login log over again
        First, fetch all of the steam ids acquired from gportal's ftp login file. Because we want to display player data, we must 
        use both the steam and a third-party API to fetch information based on their steam account id and their IPv4 address. 
        */ 
            steam_web_api_player_info.setPlayerSteamId(user_steam_id);
            for (let i = 0; i < player_ipv4_addresses.length; i++) { 
                ipApi_player_info.setPlayerIpAddress(player_ipv4_addresses[i]);
                player_info = await ipApi_player_info.fetchJsonApiDataFromIpApiDotCom();
                player_steam_info = await steam_web_api_player_info.fetchJsonApiDataFromSteamWebApi();
                player_steam_data = player_steam_info.response.players[0];
                    const embedded_message = new EmbedBuilder()
                        .setColor(0x299bcc)
                        .setTitle('SCUM new player login information')
                        .setThumbnail('https://i.imgur.com/dYtjF3w.png')
                        .addFields(
                            {name:"Steam id",value:player_steam_data.steamid,inline:true},
                            {name:"Steam name",value:player_steam_data.personaname,inline:true},
                            {name:"Profile Url",value:player_steam_data.profileurl,inline:true},
                            {name:"IPv4 address",value:player_info.query,inline:true},
                            {name:"Country",value:player_info.country,inline:true},
                            {name:"Region name",value:player_info.regionName,inline:true},
                            {name:"City",value:player_info.city,inline:true},
                            {name:"Timezone",value:player_info.timezone,inline:true},
                            {name:"Service provider",value:player_info.isp,inline:true},
                            {name:"Organization",value:player_info.org,inline:true},
                            {name:"AS",value:player_info.as,inline:true}
                        )
                        .setTimestamp()
                        .setFooter({ text: 'SCUM Bot Monitor', iconURL: 'https://i.imgur.com/dYtjF3w.png' });
                    discord_channel.send({ embeds: [embedded_message] });
            }
        }
    }
}

function checkTcpConnectionToServer(discord_scum_game_chat_messages) {
    message_for_discord_chat = '';
    tcpConnectionChecker.checkWindowsHasTcpConnectionToGameServer((game_connection_exists) => {
        if (game_connection_exists) {
            message_for_discord_chat = 'The bot is online and connected to the SCUM server';
            if (!gportal_ftp_connection_issue) {
                message_for_discord_chat = 'The bot is having FTP connection issues';
            }
            discord_scum_game_chat_messages.send(`${message_for_discord_chat}`);
        } else {
            reinitializeBotOnServer();
        }
    });
}

function checkIfGameServerOnline() {
    tcpConnectionChecker.checkWindowsCanPingGameServer((game_server_online) => {
        if (game_server_online) {
            startFtpFileProcessingIntervalLoginLog();
            startFtpFileProcessingIntervalChatLog();
            establishFtpConnectionToGportal();
            startCheckLocalServerTimeInterval();
        } else {
            stopFileProcessingIntervalChatLog();
            stopFileProcessingIntervalLoginLog();
            stopCheckLocalServerTimeInterval();
        }
    });
}

/**
 * The discord API triggers an event called 'ready' when the discord bot is ready to respond to commands and other input. 
 */
client_instance.on('ready', () => {
    /**
     * Access the discord API channel cache for a specific guild (server) and fetch channels via their id
     */
    const discord_channel_id_for_logins = process.env.discord_channel_id_for_logins
    const discord_channel_id_for_scum_chat = process.env.discord_channel_id_for_scum_chat
    const discord_channel_id_for_bot_online = process.env.discord_channel_id_for_bot_online
    const discord_channel_id_for_first_time_logins = process.env.discord_channel_id_for_first_time_logins
    const discord_channel_id_for_server_info = process.env.discord_channel_id_for_server_info
    const discord_scum_game_ingame_messages_chat = client_instance.channels.cache.get(discord_channel_id_for_scum_chat);
    const discord_scum_game_login_messages_chat = client_instance.channels.cache.get(discord_channel_id_for_logins);
    const discord_scum_game_bot_online_chat = client_instance.channels.cache.get(discord_channel_id_for_bot_online);
    const discord_scum_game_first_time_logins_chat = client_instance.channels.cache.get(discord_channel_id_for_first_time_logins);
    const discord_server_info_chat = client_instance.channels.cache.get(discord_channel_id_for_server_info);

    /**
     * A 60t    Wilson bot has been activated and is ready to use
     * -second interval that reads all contents from the in-game SCUM server chat and uses the discord API EmbedBuilder to write a nicely-formatted chat message
     * into discord. This allows administrators to monitor the in-game SCUM chat remotely. Each time we enter this interval with the SCUM in-game chat logs, we will copy those
     * logs to another array, and compare that array to the next iteration of chat logs. 
     *  We use a callback function because the Node.js package 'exec' is asynchronous, but this callback function is synchronous
     */
    // setInterval(() => {
    //     if (typeof player_chat_messages_sent_inside_scum === 'undefined') {            
    //         message_logger.logError(`The FTP file for player chat messages could not be fetched`);
    //         return;
    //     }
    //     sendPlayerMessagesToDiscord(player_chat_messages_sent_inside_scum, discord_scum_game_ingame_messages_chat);
    // }, gportal_ftp_server_log_interval_seconds["20"]);


    // setInterval(() => {
    //     if (typeof player_ftp_log_login_messages === 'undefined') {
    //         message_logger.logError(`The FTP file for player log login messages could not be fetched.`);
    //         return;
    //     }
    //     sendPlayerLoginMessagesToDiscord(player_ftp_log_login_messages, discord_scum_game_login_messages_chat);
    // }, gportal_ftp_server_log_interval_seconds["20"]);

    /**
     * A 60 second interval which returns a callback function from a class which checks to see if the bot is connected to the SCUM game server.
     * This check is based on whether there is a TCP connection to the game server. This method is used because the bot is a regular .exe file on a computer,
     * and therefore can access all of the computer resources. 
     * We use a callback function because the Node.js package 'exec' is asynchronous, but this callback function is synchronous
     */
    // setInterval(() => {
    //     checkTcpConnectionToServer(discord_scum_game_bot_online_chat);
    // }, gportal_ftp_server_log_interval_seconds["300"]);

    /**
     * A 10 second interval which returns a callback function from a class which checks to see if the bot can ping the game server, indicating that the game server is currently online
     * This check is based on whether a ping request is responded to with a valid reply. This method is used because the bot is a regular .exe file on a computer,
     * and therefore can access all of the computer resources
     * We use a callback function because the Node.js package 'exec' is asynchronous, but this callback function is synchronous
     */
    // setInterval(() => {
    //     checkIfGameServerOnline();
    // }, gportal_ftp_server_log_interval_seconds["60"]);

    /**
     * Use the Discord API ButtonBuilder to build a button that will return a JSON API response from the Battlemetrics API to indicate the current status of the server
     * We must add an ActionRowBuilder to add functionality, or action events, to the button
     * After the button is constructed, we will send that button to the discord chat we are targeting
     */
    // const server_info_button = new ButtonBuilder()
	// 	.setCustomId('serverinformationbutton')
	// 	.setLabel('View server info')
	// 	.setStyle(ButtonStyle.Success);

	// const button_row = new ActionRowBuilder()
	// 	.addComponents(server_info_button);

    // discord_server_info_chat.send({
    //     content: "Click the button below to get server information",
    //     components: [button_row]
    // });
    
    myEmitter.on('newUserJoinedServer', (steam_id) => {
        sendNewPlayerLoginMessagesToDiscord(player_ipv4_addresses, steam_id, discord_scum_game_first_time_logins_chat)
    });

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

async function loadCommandFilesIntoCollection() {
    client_instance.commands = new Collection();
    client_instance.discord_commands = new Collection();

    const commands_folder_path = path.join(__dirname, "../commands/discordcommands");
    const filtered_commands_files = fs
        .readdirSync(commands_folder_path)
        .filter((file) => file !== "deploy-commands.js" && file.endsWith(".js"));

    for (const command_file of filtered_commands_files) {
        const command_file_path = path.join(commands_folder_path, command_file);
        try {
            const commandModule = await import(command_file_path); // Dynamic import for ES Module
            const command_object = commandModule.default(); // Assuming default export is a function that returns the command object
            client_instance.commands.set(command_object.data.name, commandModule);
            client_instance.discord_commands.set(command_object.data.name, command_object);
        } catch (error) {
            console.error(`There was an error when attempting to import the file ${command_file}: ${error}`);
            throw error;
        }
    }
}


/**
* When the discord API triggers the interactionCreate event, an asynchronous function is executed with the interaction passed in as a parameter value. 
* If the interaction is not a command, the function does not continue executing.
* @param {any} interaction 
* @returns ceases execution of the function if the interaction is not a command, if the user sent the message in the wrong channel, or if the user cannot use this command
*/
client_instance.on('interactionCreate',  async (interaction) => {
    if (interaction.isButton()) {
        if (interaction.customId === 'serverinformationbutton') {
            const battlemetrics_server_data_object = await battlemetrics_server_info.fetchJsonApiDataFromBattlemetrics();
            const battlemetrics_server_json_data = battlemetrics_server_data_object.data.attributes;
            const battlemetrics_server_id = battlemetrics_server_json_data.id;
            const battlemetrics_server_name = battlemetrics_server_json_data.name;
            const battlemetrics_server_ip = battlemetrics_server_json_data.ip;
            const battlemetrics_server_port = battlemetrics_server_json_data.port;
            const battlemetrics_server_players = battlemetrics_server_json_data.players;
            const battlemetrics_server_max_players = battlemetrics_server_json_data.maxPlayers;
            const battlemetrics_server_rank = battlemetrics_server_json_data.rank;
            const battlemetrics_server_version = battlemetrics_server_json_data.details.version;
            const battlemetrics_server_time = battlemetrics_server_json_data.details.time;
            const embedded_message = new EmbedBuilder()
                .setColor(0x299bcc)
                .setTitle(`${process.env.server_name}`)
                .setThumbnail(`https://i.imgur.com/dYtjF3w.png`)
                .addFields(
                    {name:'Server name',value:battlemetrics_server_name,inline:true},
                    {name:'Server Id',value:battlemetrics_server_id,inline:true},
                    {name:'IPv4 server address',value:battlemetrics_server_ip,inline:true},
                    {name:'Server port',value:battlemetrics_server_port.toString(),inline:true},
                    {name:'Current online players',value:String(battlemetrics_server_players),inline:true},
                    {name:'Server maximum online players',value:String(battlemetrics_server_max_players),inline:true},
                    {name:'Server ranking',value:String(battlemetrics_server_rank),inline:true},
                    {name:'Server version',value:battlemetrics_server_version,inline:true},
                    {name:'Server time',value:battlemetrics_server_time,inline:true}
                )
                .setTimestamp()
                .setFooter({text:'SCUM bot monitor', iconURL: 'https://i.imgur.com/dYtjF3w.png'});

            await interaction.reply({embeds:[embedded_message],ephemeral:true});
        }
    }

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
    // if (!(determineIfUserMessageInCorrectChannel(interaction.channel.id, discord_chat_channel_bot_commands))) {
    //     await interaction.reply({ content: `You must use bot commands in the SCUM game server to execute them` });
    //     return;
    // }

    /**
     * If the user has permission to execute a command on discord, attempt to execute that command. If they do not, inform them they do not have permission to use that command
     * In each command file in the 'commands' directory, there is an object property called 'authorization_role_name' that dictates the role a user must have to execute the command
     */
    if (determineIfUserCanUseCommand(interaction.member, command.authorization_role_name)) { 
        await command.execute(interaction);
        // try {
        //     await command.execute(interaction);
        // } catch (error) {
        //     await interaction.reply({ content: `There was an error while executing this command! Please try again or contact a server administrator regarding this error: ${error}`, ephermal: true });
        // }
    } else {
        await interaction.reply({ content: `You do not have permission to execute the command ${command.data.name}. Contact a server administrator if you believe this is an error` });
    }
});

/**
 * The guildCreate event is triggered when the Discord bot joins a new server
 */
client_instance.on('guildCreate', async (guild) => {
    const bot_id = client_instance.user.id;
    const guild_id = guild.id;
    try {
        await registerInitialSetupCommands(bot_token, bot_id, guild_id);
        // await createBotCategoryAndChannels(guild);
    } catch (error) {
        throw new Error(error);
    }
});

client_instance.on(Events.InteractionCreate, async interaction => {
    if (interaction.isModalSubmit()) {

        const guild_id = interaction.guild.id
  
        if (interaction.customId === 'userDataInputModal') {
            const user_username = interaction.fields.getTextInputValue('usernameInput');
            const user_email = interaction.fields.getTextInputValue('emailInput');
            const user_password_hash_object = hashPassword(interaction.fields.getTextInputValue('passwordInput'));
            const guild_id = interaction.guildId;

            const bot_information = {
                bot_username: user_username,
                bot_email: user_email,
                bot_password_hash: user_password_hash_object.hash,
                bot_password_salt: user_password_hash_object.salt,
                bot_id: bot_token,
                guild_id: guild_id
            }

            console.log(bot_information.bot_password_hash);
            console.log(bot_information.bot_password_salt);

            try {
                await bot_repository.createBot(bot_information);            
            } catch (error) {
                throw new Error(`There was an error when attempting to create a bot for you. Please inform the server administrator of this error: ${error}`);
            }
        } 
        else if (interaction.customId === `channelIdsInputModal`) {
            const ingame_chat_channel_id = interaction.fields.getTextInputValue(`ingameChatChannelInput`);
            const logins_chat_channel_id = interaction.fields.getTextInputValue(`loginsChannelInput`);
            const new_player_joins_channel_id = interaction.fields.getTextInputValue(`newPlayerJoinsChannelInput`);
            const battlemetrics_data_channel_id = interaction.fields.getTextInputValue(`battlemetricsServerInput`);
            const server_info_button_channel_id = interaction.fields.getTextInputValue(`serverInfoButtonInput`);

            const discord_channel_ids = {
                discord_ingame_chat_channel_id: ingame_chat_channel_id,
                discord_logins_chat_channel_id: logins_chat_channel_id,
                discord_new_player_chat_channel_id: new_player_joins_channel_id,
                discord_batlemetrics_server_id: battlemetrics_data_channel_id,
                discord_server_info_button_channel_id: server_info_button_channel_id,
                guild_id: guild_id
            }

            try {
                await bot_repository.createBotDiscordData(discord_channel_ids);
            } catch (error) {
                throw new Error(`There was an error when attempting to update your bot with Discord channel data. Please inform the server administrator of this error: ${error}`);
            }
        } 
        else if (interaction.customId === `gameServerInputModal`) {
            const ipv4_address = interaction.fields.getTextInputValue(`ipv4AddressInput`);
            const port = interaction.fields.getTextInputValue(`portInput`);

            const game_server_data = {
                game_server_hostname_input: ipv4_address,
                game_server_port_input: port,
                guild_id: guild_id
            }

            try {
                await bot_repository.createBotGameServerData(game_server_data);
            } catch (error) {
                throw new Error(`There was an error when attempting to update your bot with game server data. Please inform the server administrator of this error: ${error}`);
            }
        }
        else if (interaction.customId === `ftpServerInputModal`) {
            const ipv4_address = interaction.fields.getTextInputValue(`ipv4AddressInput`);
            const port = interaction.fields.getTextInputValue(`portInput`);
            const username = interaction.fields.getTextInputValue(`usernameInput`);
            const password = interaction.fields.getTextInputValue(`passwordInput`);

            const ftp_server_data = {
                server_hostname: ipv4_address,
                server_port: port,
                server_username: username,
                server_password: password,
                guild_id: guild_id
            }

            try {
                await bot_repository.createBotFtpServerData(ftp_server_data);
            } catch (error) {
                throw new Error(`There was an error when attempting to update your bot with FTP server data. Please inform the server administrator of this error: ${error}`);
            }
        }
  
      if (interaction.customId === `userDataInputModal`) {
        await interaction.reply({content: `Your submission for creating new user data with your bot was successful`, ephemeral: true});
      } else if (interaction.customId === `channelIdsInputModal`) {
        await interaction.reply({content: `Your submission for creating new channel ids with your bot was successful`, ephemeral: true});
      } else if (interaction.customId === `gameServerInputModal`) {
        await interaction.reply({content: `Your submission for creating new game server data with your bot was successful`, ephemeral: true});
      } else if (interaction.customid === `ftpServerInputModal`) {
        await interaction.reply({content: `Your submission for creating new ftp server data with your bot was successful`, ephemeral: true});
      }
    }
  });

async function createBotCategoryAndChannels(guild) {
    try {
        const category_creation_response = await guild.channels.create({
            name: `Chat monitor bot`,
            type: ChannelType.GuildCategory
        });

        const channel_names = [
            "In game messages",
            "Log ins and log outs",
            "New player joins",
            "Server battlemetrics link",
            "Server info button"
        ];

        for (const channel_name of channel_names) {
            if (channel_name) {
                await guild.channels.create({
                    name: `${channel_name}`,
                    type: ChannelType.GuildText,
                    parent: category_creation_response.id
                });
            }
        }
    } catch (error) {
        console.error(`There was an error when setting up the bot channels. Please inform the server administrator of this error: ${error}`);
        throw new Error(`There was an error when setting up the bot channels. Please inform the server administrator of this error: ${error}`);
    }
}

async function registerInitialSetupCommands(bot_token, bot_id, guild_id) {
    const commands_folder_path = path.join(__dirname, "./commands/discordcommands");
    const filtered_command_files = fs
        .readdirSync(commands_folder_path)
        .filter((file) => file !== "deploy-commands.js");
    client_instance.discord_commands = new Collection();

    const commands = [];

    const initial_bot_commands = [`setupuser`, `setupchannels`, `setupgameserver`, `setupchannels`, `setupftpserver`];

    for (const command_file of filtered_command_files) {
        const command_file_path = path.join(commands_folder_path, command_file);
        const command_file_url = pathToFileURL(command_file_path).href;
        const command_import = await import(command_file_url);
        const command_default_object = command_import.default();

        if (initial_bot_commands.includes(command_default_object.data.name)) {
            commands.push(command_default_object.data);
            client_instance.discord_commands.set(command_default_object.data.name, command_default_object);
        }
    }

    if (bot_token && bot_id && guild_id) {
        const rest = new REST({ version: '10' }).setToken(bot_token)
        
        rest.put(Routes.applicationGuildCommands(bot_id, guild_id), {
            body: commands
        }).then(() => {
            console.log(`The initial application setup commands were successfully registered for ${bot_id} in the guild ${guild_id}`);
        }).catch((error) => {
            console.error(`There was an error when attempting to register the initial application commands for ${bot_id} in the guild ${guild_id}: ${error}`);
        });
    }
}

/**
 * Uses the Windows powershell command 'System.Windows.Forms.Clipboard]::SetText() to copy some text to the system clipboard
 * In the else clause, there is a debug log message if you want to uncomment that for development purposes
 * @param {string} text A string of text which will be copied to the system clipboard 
 */
function copyToClipboard(text) {
    const command = `powershell.exe -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::SetText('${text.replace(/'/g, "''")}')"`
    exec(command, (error) => {
        if (error) {
            message_logger.logError(`Error copying contents to the clipboard: ${error}`);
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
            message_logger.logError(`Error pasting the contents from clipboard: ${error}`);
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
            message_logger.logError(`Error when pressing the tab key: ${error}`);
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
            message_logger.logError(`Error when pressing the character key T: ${error}`);
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
            message_logger.logError(`Error when pressing the backspace key: ${error}`);
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
            message_logger.logError(`Error when pressing the enter key: ${error}`);
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
    await sleep(500);
    copyToClipboard(command);
    await sleep(500);
    pressCharacterKeyT();
    await sleep(500);
    pressBackspaceKey();
    await sleep(500);
    pasteFromClipboard();
    await sleep(500);
    pressEnterKey();
    await sleep(500);
}

async function enqueueCommand(user_chat_message_object) {
    user_command_queue.enqueue(user_chat_message_object);
    await setProcessQueueMutex();
}

// process.on('uncaughtException', (error) => {
//     message_logger.logError(error);
// });


// process.on('exit', (error) => {
//     message_logger.logError(`Process exited with code: ${error}`);
// });


/**
 * This function iterates through all of the SCUM in-game chat messages starting with '!' recorded into the gportal chat log into a queue in preparation 
 * for sequential execution.
 */
async function handleIngameSCUMChatMessages() {
    /**
     * Fetch the data from the resolved promise returned by readAndFormatGportalFtpServerChatLog. This contains all of the chat messages said on the server. 
     *console.log('Ftp server chat log is: ' + ftp_server_chat_log);
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
        await enqueueCommand(ftp_server_chat_log[i]);
    }
}

async function setProcessQueueMutex() {
    mutex
        .runExclusive(async () => {
            await processQueueIfNotProcessing();
        })
        .then(() => {

        })
        .catch((error) => {
            if (e === E_CANCELED) {
                mutex.cancel();
            } else {
                console.error(`An error has occurred during execution of the mutex: ${error}`);
            }
        })
        .finally(() => {
            mutex.release();
        })
}

async function processQueueIfNotProcessing(user_chat_object) {
    while (user_command_queue.size() > 0) { 
        /**
         * After a command has finished execution in the queue, shift the values one spot to remove the command which has been executed. Extract the command 
         * and the steam id of the user who executed the command
         */
        const user_chat_message_object = user_command_queue.dequeue();
        
        /*
        user_chat_message_object is a key value pair. If the value for that key is undefined, continue to the next element. 
        */
        if (user_chat_message_object.value === undefined) { 
            await runCommand(user_chat_object);
            continue;
        }

        /*
        The key value pair object 'user_chat_message_object' holds the command that the user used as the value. We must fetch the value by referencing the first
        element in the value property. The value property starts with a ' character, so we take a substring of the value starting after the first character. 
        Next, we have to take the key associated with the command used, which is the user's steam id
        */
        const command_name = user_chat_message_object.value[0].substring(1);
        const command_to_execute_player_steam_id = user_chat_message_object.key[0];

        /**
         * Fetch the user from the database with an id that corresponds with the one associated with the executed command. After, fetch all of properties and data from the user and command
         * that is relevant
         */
        const user_account = await user_repository.findUserById(command_to_execute_player_steam_id);
        const user_account_balance = user_account.user_money;

        /*
        By using a string representation of the command to execute, we will fetch the command from the MongoDB database. If the command executed in game is '/test', 
        a document with the name 'test' will be searched for in MongoDB. MongoDB returns the bot_item_package as an object instead of an array of objects. 
        */
        const bot_item_package = await bot_repository.getBotPackageFromName(command_name.toString());
        const bot_package_items = bot_item_package.package_items;
        const bot_item_package_cost = bot_item_package.package_cost;

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
        if (command_name === 'welcomepack') {
            const welcome_pack_cost = user_account.user_welcome_pack_cost;
             if (user_account_balance < welcome_pack_cost) {
                 await enqueueCommand(`${client_ingame_chat_name} you do not have enough money to use your welcome pack again. Use the command /balance to check your balance`);
                 continue;
             } else {
                 await user_repository.updateUserWelcomePackUsesByOne(user_account.user_steam_id);
                 await user_repository.updateUserAccountBalance(command_to_execute_player_steam_id, -welcome_pack_cost);
             }
        }

        if (user_account_balance < bot_item_package.package_cost) {
            await enqueueCommand(`${client_ingame_chat_name}, you do not have enough money to use this package. Use the command /balance to check your balance.`);
            continue;
        }
        /**
         * If the cost to execute the command does not equal undefined, subtract the balance of the package from the user's balance 
         */
        if ((typeof bot_item_package_cost !== 'Number' && bot_item_package_cost)) {
            parseInt(bot_item_package_cost, 10);
            await user_repository.updateUserAccountBalance(command_to_execute_player_steam_id, -bot_item_package_cost);

        }
        /**
         * Open the chat menu by pressing the 'T' key. If the chat is already open, press the 'Backspace key to get rid of the hanging 'T' character
         */
        for (let i = 0; i < bot_package_items.length; ++i) {
            await runCommand(bot_package_items[i]);
        } 
    }
}

/**
 * Bot interacts with the discord API to 'log in' and become ready to start executing commands
 */
client_instance.login(bot_token);

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

export default app;