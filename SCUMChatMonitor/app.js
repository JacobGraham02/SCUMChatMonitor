require('dotenv').config();

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var indexRouter = require('./routes/index');
var adminRouter = require('./routes/admin');

const crypto = require('crypto');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const hashAndValidatePassword = require('./modules/hashAndValidatePassword');
const FTPClient = require('ftp');
const DatabaseConnectionManager = require('./database/DatabaseConnectionManager');
const UserRepository = require('./database/UserRepository');
const MongoStore = require('connect-mongo');
const { exec } = require('child_process');
const fs = require('node:fs');
const { discord_bot_token } = require('./config.json');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

const client_instance = new Client({
    intents: [GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    ]
});
const message_content_command_regex = /([!/a-zA-Z]{1,20})/g;
const discord_chat_channel_bot_commands = '1125874103757328494';

databaseConnectionManager = new DatabaseConnectionManager();
userRepository = new UserRepository();

// The following regex string is for steam ids associated with a steam name. They are saved as a 17-digit number; (e.g. 12345678912345678)
const login_log_steam_id_regex = /([0-9]{17})/g;


const chat_log_steam_id_regex = /([0-9]{17})/g;


// The following regex string is for steam names which match the same format as the ones in gportal's ftp files: username(number); e.g. boss612man(100)
const login_log_steam_name_regex = /([a-zA-Z0-9 ._-]{0,32}\([0-9]{1,10}\))/g;


// const chat_log_messages_from_wilson_regex = /('76561199505530387:Wilson\24\' '?:Local|Global|Admin:.*)'/g;


const chat_log_messages_regex = /(?<=Global: |Local: |Admin: )[^\n]*[^'\n]/g;


const gportal_ftp_server_target_directory = 'SCUM\\Saved\\SaveFiles\\Logs\\';
const gportal_ftp_server_filename_prefix_login = 'login_';
const gportal_ftp_server_filename_prefix_chat = 'chat_';

// The localhost port on which the nodejs server will listen for connections
const server_port = 3000;

const five_seconds_in_milliseconds = 5000;
const one_hundred_milliseconds = 100;

const gportal_ftp_config = {
    host: process.env.gportal_ftp_hostname,
    port: process.env.gportal_ftp_hostname_port,
    user: process.env.gportal_ftp_username,
    password: process.env.gportal_ftp_password,
};

const username_and_password_fields = {
    username_field: 'username',
    password_field: 'password'
};

var app = express();

app.use(session({
    secret: process.env.express_session_key,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.mongodb_connection_string })
}));

app.use(passport.initialize());
app.use(passport.session());

let existing_cached_file_content_hash = '';
let ftp_login_file_lines_already_processed = 0;

async function readAndFormatGportalFtpServerLoginLog(request, response) {
    try {
        const ftpClient = new FTPClient();
        await new Promise((resolve, reject) => {
            ftpClient.on('ready', resolve);
            ftpClient.on('error', reject);
            ftpClient.connect(gportal_ftp_config);
        });

        console.log('FTP client connected and authenticated');

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

        if (current_file_content_hash === existing_cached_file_content_hash) {
            return;
        } else {
            console.log('The current stored hash for the ftp login file is not the same as the new one');
            existing_cached_file_content_hash = current_file_content_hash;
        }

        const browser_file_contents = file_contents.replace(/\u0000/g, '');

        const lines = browser_file_contents.split('\n');

        // If we have already processed the lines that exist in the ftp file, remove them
        if (ftp_login_file_lines_already_processed < lines.length) {
            lines.splice(0, ftp_login_file_lines_already_processed);
        }
        // Update the number of lines processed
        ftp_login_file_lines_already_processed += lines.length;

        const new_file_content = lines.join('\n');

        // The below values return as an object containing values
        const file_contents_steam_ids = browser_file_contents.match(login_log_steam_id_regex);
        const file_contents_steam_messages = browser_file_contents.match(login_log_steam_name_regex);

        const file_contents_steam_ids_array = Object.values(file_contents_steam_ids);
        const file_contents_steam_name_array = Object.values(file_contents_steam_messages);

        const user_steam_ids = {};
        for (let i = 0; i < file_contents_steam_ids_array.length; i++) {
            user_steam_ids[file_contents_steam_ids_array[i]] = file_contents_steam_name_array[i];
        }

        await insertSteamUsersIntoDatabase(Object.keys(user_steam_ids), Object.values(user_steam_ids));

        ftpClient.end();
    } catch (error) {
        console.log('Error processing files:', error);
        response.status(500).json({ error: 'Failed to process files' });
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

        console.log('FTP client connected and authenticated');

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

        if (current_file_content_hash === existing_cached_file_content_hash) {
            return;
        } else {
            console.log('The current stored hash for the ftp chat log file is not the same as the new one');
            existing_cached_file_content_hash = current_file_content_hash;
        }

        const browser_file_contents = file_contents.replace(/\u0000/g, '');

        // The below values return as an object containing values
        if (!browser_file_contents.match(chat_log_steam_id_regex) && browser_file_contents.match(chat_log_messages_regex)) {
            return;
        } 
        const file_contents_steam_ids = browser_file_contents.match(chat_log_steam_id_regex);
        const file_contents_steam_id_messages = browser_file_contents.match(chat_log_messages_regex);

        const file_contents_steam_ids_array = Object.values(file_contents_steam_ids);
        const file_contents_steam_id_messages_array = Object.values(file_contents_steam_id_messages); 

        const user_steam_id_and_chat_messages = [];
        for (let i = 0; i < file_contents_steam_ids_array.length; i++) {
            user_steam_id_and_chat_messages.push({
                key: file_contents_steam_ids_array[i],
                value: file_contents_steam_id_messages_array[i]
            });
        }

        return user_steam_id_and_chat_messages;

        ftpClient.end();
    } catch (error) {
        console.log('Error processing files:', error);
        response.status(500).json({ error: 'Failed to process files' });
    }
}

function startFtpFileProcessingIntervalChatLog() {
    read_login_ftp_file_interval = setInterval(handleIngameSCUMChatMessages, five_seconds_in_milliseconds);
}

function startFtpFileProcessingIntervalLoginLog() {
    read_login_ftp_file_interval = setInterval(readAndFormatGportalFtpServerLoginLog, five_seconds_in_milliseconds);
}
function stopFileProcessingInterval() {
    clearInterval(read_login_ftp_file_interval);
}

function enableDevelopmentModeForReadingLoginFile() {
    stopFileProcessingInterval();
    app.get('/process-login-ftp-file', handleGportalFtpFileProcessingLogins);
}

function insertAdminUserIntoDatabase(admin_user_username, admin_user_password) {
    database_manager = new DatabaseConnectionManager();
    user_repository = new UserRepository();

    const hashed_admin_user_password = hashAndValidatePassword.hashPassword(admin_user_password);

    user_repository.createAdminUser(admin_user_username, hashed_admin_user_password);
}

async function readSteamUsersFromDatabase() {
    database_manager = new DatabaseConnectionManager();
    user_repository = new UserRepository();
    user_repository.findAllUsers().then((results) => { console.log(results) });
}

async function insertSteamUsersIntoDatabase(steam_user_ids_array, steam_user_names_array) {
    database_manager = new DatabaseConnectionManager();
    user_repository = new UserRepository();

    for (let i = 0; i < steam_user_ids_array.length; i++) {
        user_repository.createUser(steam_user_names_array[i], steam_user_ids_array[i]);
    }
}

//startFtpFileProcessingIntervalChatLog();
//startFtpFileProcessingIntervalLoginLog();
handleIngameSCUMChatMessages();

//insertAdminUserIntoDatabase('jacobg', 'test123');

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

passport.deserializeUser(function (uuid, done) {
    database_manager = new DatabaseConnectionManager();
    user_repository = new UserRepository();
    user_repository.findAdminByUuid(uuid).then(function (admin_data_results) {
        done(null, admin_data_results);
    }).catch(error => {
        done(error, null);
    });
});
// catch 404 and forward to error handler
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

const commands_path = path.join(__dirname, 'commands');
const command_files_list = fs.readdirSync(commands_path).filter(file => file.endsWith('.js'));

client_instance.commands = new Collection();

for (const command_file of command_files_list) {
    const command_file_path = path.join(commands_path, command_file);
    const command = require(command_file_path);
    client_instance.commands.set(command.data.name, command);
}

client_instance.on('ready', () => {
    console.log(`The bot is logged in as ${client_instance.user.tag}`);
});

client_instance.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) {
        return;
    }

    const command = client_instance.commands.get(interaction.commandName);

    if (!command) {
        return;
    }

    if (!(determineIfUserMessageInCorrectChannel(interaction.channel.id, discord_chat_channel_bot_commands))) {
        await interaction.reply({ content: `You are using this command in the wrong channel` });
        
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
 * The value returned from the function readAndFormatGportalFtpServerChatLog() is a Promise containing an object of steam user ids and messages contained in gportal's
 * ftp log file. We must use the .then() function 
 */
async function handleIngameSCUMChatMessages() {
    readAndFormatGportalFtpServerChatLog().then((user_steam_ids_and_messages) => {
        if (user_steam_ids_and_messages === undefined) {
            return;
        }
        
        for (let i = 0; i < user_steam_ids_and_messages.length; i++) {
            let object = user_steam_ids_and_messages[i];

            const command_to_execute = object.value.startsWith('!') ? object.value.substring(1) : null;

            if (client_instance.commands.get(command_to_execute)) {
                const client_command_data = client_instance.commands.get(command_to_execute).command_data;

                for (const command_data of client_command_data) {
                    //type_in_global_chat(command_data);
                    console.log(`Command data: ${command_data}`);
                }
            }
        }
    });
}
client_instance.login(discord_bot_token);

function determineIfUserCanUseCommand(message_sender, client_command_values) {
    if (client_command_values.authorization_role_name === undefined) {
        return true;
    }
    return message_sender.roles.cache.some(role => client_command_values.authorization_role_name.includes(role.name));
}

function determineIfUserMessageMatchesRegex(user_message) {
    console.log(`User message matches regex: ${message_content_command_regex.test(user_message)}`);
    return message_content_command_regex.test(user_message);
}

function determineIfUserMessageInCorrectChannel(channel_message_was_sent, channel_name) {
    console.log(`Channel message was sent: ${channel_message_was_sent}`);
    console.log(`Channel name: ${channel_name}`);
    return channel_message_was_sent === channel_name;
}

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

async function runCommand(command) {
    copyToClipboard(command);
    const scumProcess = exec('powershell.exe -c "Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public class User32 { [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr hWnd); }\'"');
    if (!scumProcess) {
        return;
    }

    await sleep(one_hundred_milliseconds);
    pressCharacterKeyT();
    await sleep(one_hundred_milliseconds);
    pressBackspaceKey();
    await sleep(one_hundred_milliseconds);
    pasteFromClipboard();
    await sleep(one_hundred_milliseconds);
    pressEnterKey();
}
function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function type_in_global_chat(content) {
    console.log(`Global chat announcement ${content}`);
    runCommand(`${content}`);
}


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