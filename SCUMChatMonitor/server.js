require('dotenv').config();

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var database_manager = require('./database/DatabaseConnectionManager');
var indexRouter = require('./routes/index');

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const encryptAndValidatePassword = require('./modules/encryptionAndValidation');
const userRepository = require('./database/UserRepository'); 

const steam_id_regex = /'([0-9]*):/g;

const gportal_ftp_server_target_directory = 'SCUM\\Saved\\SaveFiles\\Logs\\';
const gportal_ftp_server_filename_prefix = 'chat_';

const user_steam_ids = new Array();

const gportal_ftp_config = {
    host: process.env.gportal_ftp_hostname,
    port: process.env.gportal_ftp_hostname_port,
    user: process.env.gportal_ftp_username,
    password: process.env.gportal_ftp_password,
};

const FTPClient = require('ftp');

var app = express();
const server_port = 3000;

app.get('/process-files', (request, response) => {
    const ftpClient = new FTPClient();
    ftpClient.on('ready', () => {
        console.log('FTP client connected and authenticated');

        ftpClient.list(gportal_ftp_server_target_directory, (error, files) => {
            if (error) {
                console.log('Error retrieving file listing:', error);
                response.status(500).json({ error: 'Failed to retrieve file listing' });
                ftpClient.end();
                return;
            }

            const matching_files = files
                .filter(file => file.name.startsWith(gportal_ftp_server_filename_prefix))
                .sort((file_one, file_two) => file_two.date - file_one.date);
            if (matching_files.length === 0) {
                response.status(500).json({ message: `No files were found that started with the prefix ${gportal_ftp_server_filename_prefix}`});
                ftpClient.end();
                return;
            }

            const filePath = `${gportal_ftp_server_target_directory}${matching_files[0].name}`;
            ftpClient.get(filePath, (error, stream) => {
                if (error) {
                    response.status(500).json({ error: `The file was present in gportal, but could not be fetched. ${error}`});
                    ftpClient.end();
                    return;
                }

                let file_contents = '';
                stream.on('data', (chunk) => {
                    console.log(`Stream data is incoming from the specific ftp server log`);
                    file_contents += chunk;
                });

                stream.on('end', () => {
                    console.log(`Data stream from the specific ftp server log has completed successfully`);
                    console.log('File contents retrieved from the data stream: ', file_contents);

                    const browser_file_contents = file_contents.replace(/\u0000/g, '');

                    const matches_array = browser_file_contents.match(steam_id_regex);

                    for (let matching_string of matches_array) {
                        console.log(`Steam id of user: ${matching_string = matching_string.substring(1, matching_string.length - 1)}`);
                        // Eventually get the player name associated with the steam id and push that data into the array. If we do this, a hash map can be used instead of an array
                        user_steam_ids.push(matching_string);
                    }
                    
                    response.json({
                        'File contents': browser_file_contents,
                        'User steam ids': user_steam_ids
                    });

                    ftpClient.end();
                });
            });
        });
    });

    ftpClient.on('error', (error) => {
        console.log('FTP client error:', error);
        response.status(500).json({ error: 'FTP client error' });
    });

    ftpClient.connect(gportal_ftp_config);
});

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
