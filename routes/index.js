import { Router } from 'express';
var router = Router();
import { OAuth2Client } from 'google-auth-library';
import { writeFile } from 'fs';

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

    writeFile('gmail-credentials.json', JSON.stringify(tokens), (error) => {
        if (error) {
            console.error(error);
        } else {
            console.log('gmail-credentials.json was written');
        }
    }); 
    response.send('Authentication successful! You can close this tab');
});

router.get('/login', async function (request, response, next) {
    response.render('login', {
        title: "Login page",
        user: request.user,
        currentPage: `/`
    });
}); 

router.post('/logout', isLoggedIn, function (request, response, next) {
    request.logout(function (error) {
        if (error) {
            return next(error);
        }
        response.render(
            'login', {
                user: request.user,
                currentPage: '/login',
                show_submit_modal: true,
                alert_title: "Successful log out",
                alert_description: "You have successfully logged out of your account"
            });
    });
});

export default router;
