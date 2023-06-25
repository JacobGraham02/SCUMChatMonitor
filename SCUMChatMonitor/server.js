require('dotenv').config();

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var indexRouter = require('./routes/index');
var database_manager = require('./database/DatabaseConnectionManager');
var userRepository = require('./database/UserRepository'); 

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const encryptAndValidatePassword = require('./modules/encryptionAndValidation');
const FTPClient = require('ftp');
const DatabaseConnectionManager = require('./database/DatabaseConnectionManager');
const UserRepository = require('./database/UserRepository');

// The following regex string is for steam ids associated with a steam name. They are saved as a 17-digit number; (e.g. 12345678912345678)
const login_log_steam_id_regex = /([0-9]{17})/g;

// The following regex string is for steam names which match the same format as the ones in gportal's ftp files: username(number); e.g. boss612man(100)
const login_log_steam_name_regex = /([a-zA-Z0-9 ._-]{0,32}\([0-9]{1,10}\))/g

// The localhost port on which the nodejs server will listen for connections
const server_port = 3000;

const gportal_ftp_server_target_directory = 'SCUM\\Saved\\SaveFiles\\Logs\\';
const gportal_ftp_server_filename_prefix = 'login_';

const gportal_ftp_config = {
    host: process.env.gportal_ftp_hostname,
    port: process.env.gportal_ftp_hostname_port,
    user: process.env.gportal_ftp_username,
    password: process.env.gportal_ftp_password,
};

var app = express();

app.use(session({
    secret: process.env.express_session_key,
    resave: false,
    saveUninitialized: true
}));

let current_file_content_hash = '';
let cached_file_content_hash = '';
async function handleGportalFtpFileProcessing(request, response) {
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
            .filter(file => file.name.startsWith(gportal_ftp_server_filename_prefix))
            .sort((file_one, file_two) => file_two.date - file_one.date);

        if (matching_files.length === 0) {
            response.status(500).json({ message: `No files were found that started with the prefix ${gportal_ftp_server_filename_prefix}` });
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

        if (current_file_content_hash === cached_file_content_hash) {
            console.log('The current stored hash for the ftp login file is the same as the new one');
            return;
        } else {
            console.log('The current stored hash for the ftp login file is not the same as the new one');
            cached_file_content_hash = current_file_content_hash;
        }

        const browser_file_contents = file_contents.replace(/\u0000/g, '');

        // The below values return as an object containing values
        const file_contents_steam_ids = browser_file_contents.match(login_log_steam_id_regex);
        const file_contents_steam_names = browser_file_contents.match(login_log_steam_name_regex);

        const file_contents_steam_ids_array = Object.values(file_contents_steam_ids);
        const file_contents_steam_name_array = Object.values(file_contents_steam_names);

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


// startFtpFileProcessingInterval();

function startFtpFileProcessingInterval() {
    read_login_ftp_file_interval = setInterval(handleGportalFtpFileProcessing, 5000);
}

function stopFileProcessingInterval() {
    clearInterval(read_login_ftp_file_interval);
}

function enableDevelopmentModeForReadingLoginFile() {
    stopFileProcessingInterval();
    app.get('/process-login-ftp-file', handleGportalFtpFileProcessing);
}

function insertAdminUserIntoDatabase(admin_user_username, admin_user_password) {
    database_manager = new DatabaseConnectionManager();
    userRepository = new UserRepository();

    userRepository.createAdminUser(admin_user_username, admin_user_password);
}

async function readSteamUsersFromDatabase() {
    database_manager = new DatabaseConnectionManager();
    userRepository = new UserRepository();
    userRepository.findAllUsers().then((results) => { console.log(results) });
}

async function insertSteamUsersIntoDatabase(steam_user_ids_array, steam_user_names_array) {
    database_manager = new DatabaseConnectionManager();
    userRepository = new UserRepository();

    for (let i = 0; i < steam_user_ids_array.length; i++) {
        userRepository.createUser(steam_user_names_array[i], steam_user_ids_array[i]);
    }
}

const verifyCallback = (username, password, done) => {
    userRepository.findAdminByUsername(username).then((results) => {
        if (results.length === 0) {
            return done(null, false);
        }
        const admin_data = results[0];

        const is_valid_administrator_account = encryptAndValidatePassword.validatePassword(password, admin_data.password, admin_data.salt);
        const admin = {
            username: admin_data.username,
            password: admin_data.password
        };
        if (is_valid_administrator_account) {
            return done(null, admin);
        } else {
            return done(null, false);
        }
    });
}
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

const usernameAndPasswordFields = {
    username_field: 'username',
    password_field: 'password'
}

/*const verifyCallback = (username, password, done) => {
    userRepository.findUserById()
}

const strategy = new LocalStrategy()*/

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

app.listen(server_port, function () {
    console.log(`Server is running on port ${server_port}`);
})

/*app.get('/home', (request, response) => {
    console.log('Home route');
    response.render('public/home');
});*/

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
