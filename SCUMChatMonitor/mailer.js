const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const fs = require('fs');

const oauth2_client = new OAuth2Client(
    process.env.google_cloud_console_client_id,
    process.env.google_cloud_console_client_secret,
    'http://localhost:3000/botcallback'
);

const { access_token, refresh_token } = JSON.parse(fs.readFileSync('gmail-credentials.json', 'utf8'));

oauth2_client.setCredentials({ access_token, refresh_token });

const accessToken = oauth2_client.getAccessToken();

const smtpTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.scumbot_chat_monitor_email_source,
        clientId: process.env.google_cloud_console_client_id,
        clientSecret: process.env.google_cloud_console_client_secret,
        refreshToken: refresh_token,
        accessToken: accessToken
    }
});

function sendEmail(to, subject, text) {
    const mail_options = {
        from: process.env.scumbot_chat_monitor_email_source,
        to: to,
        subject: subject,
        text: text
    };

    smtpTransport.sendMail(mail_options, (error, response) => {
        error ? console.log(error) : console.log(response);
        smtpTransport.close();
    });
}

module.exports = sendEmail;
