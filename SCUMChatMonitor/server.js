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

const FTPClient = require('ftp');
const readline = require('readline');

var app = express();
const server_port = 3000;

app.get('/process-files', (request, response) => {
    const ftp_config = {
        host: process.env.gportal_ftp_hostname,
        port: process.env.gportal_ftp_hostname_port,
        user: process.env.gportal_ftp_username,
        password: process.env.gportal_ftp_password,
    };

    const target_directory = 'SCUM\\Saved\\SaveFiles\\Logs\\';
    const filename_prefix = 'chat_';

    const ftpClient = new FTPClient();
    ftpClient.on('ready', () => {
        console.log('FTP client connected and authenticated');

        ftpClient.list(target_directory, (error, files) => {
            if (error) {
                console.log('Error retrieving file listing:', error);
                response.status(500).json({ error: 'Failed to retrieve file listing' });
                ftpClient.end();
                return;
            }

            const matching_files = files
                .filter(file => file.name.startsWith(filename_prefix))
                    .sort((file_one, file_two) => file_two.name.localeCompare(file_one.name));
            if (matching_files.length === 0) {
                console.log('No matching files were found');
                response.json({ message: 'No matching files were found' });
                ftpClient.end();
                return;
            }

            const filePath = `${target_directory}${matching_files[0].name}`;
            ftpClient.get(filePath, (error, stream) => {
                if (error) {
                    console.log('Error retrieving file:', error);
                    response.status(500).json({ error: 'Failed to retrieve file' });
                    ftpClient.end();
                    return;
                }

                /*const readlines_from_file = readline.createInterface({

                });*/

                let fileContents = '';
                stream.on('data', (chunk) => {
                    console.log('Stream data incoming');
                    fileContents += chunk;
                });

                stream.on('end', () => {
                    console.log('Stream data ended');
                    console.log('File contents were retrieved: ', fileContents);

                    const browser_file_contents = fileContents.replace(/\u0000/g, '');

                    const matches_array = browser_file_contents.match(steam_id_regex);

                    for (let matching_string of matches_array) {
                        console.log(matching_string = matching_string.substring(1, matching_string.length - 1));
                    }
                    

                    response.json({ browser_file_contents });
                    ftpClient.end();
                });
            });
        });
    });

    ftpClient.on('error', (error) => {
        console.log('FTP client error:', error);
        response.status(500).json({ error: 'FTP client error' });
    });

    ftpClient.connect(ftp_config);
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
