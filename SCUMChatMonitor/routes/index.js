var express = require('express');
var router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const fs = require('fs');
const sendEmail = require('../mailer');

const oauth2_client = new OAuth2Client(
    process.env.google_cloud_console_client_id,
    process.env.google_cloud_console_client_secret,
    'http://localhost:3000/botcallback'
);

function isLoggedIn(request, response, next) {
    if (request.isAuthenticated()) {
        return next();
    } else {
        response.redirect('/login');
    }
}

/* GET home page. */
router.get('/', function (request, response, next) {
    response.render('index', { user: request.user });
});

router.get('/bot', function (request, response, next) {
    if (!request.user) {
        const url = oauth2_client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://mail.google.com/']
        });
        return response.redirect(url);
    }
    response.render('index', { user: request.user });
});

router.get('/botcallback', async function(request, response, next) {
    const { code } = request.query;

    const { tokens } = await oauth2_client.getToken(code);

    oauth2_client.setCredentials(tokens);

    fs.writeFile('gmail-credentials.json', JSON.stringify(tokens), (error) => {
        if (error) {
            console.error(error);
        } else {
            console.log('gmail-credentials.json was written');
        }
    }); 
    response.send('Authentication successful! You can close this tab');
});

router.get('/sendemail', function (request, response, next) {
    sendEmail(process.env.scumbot_chat_monitor_email_source, 'Test', 'Test');

    response.render('index', { user: request.user });
});
router.get('/login', function (request, response, next) {
    response.render('login', { title: "Login page", user: request.user });
}); 

router.post('/logout', isLoggedIn, function (request, response, next) {
    request.logout(function (error) {
        if (error) {
            return next(error);
        }
        response.redirect('/login');
    });
});

module.exports = router;
