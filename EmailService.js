const nodemailer = require('nodemailer');
const axios = require('axios');
require('dotenv').config({ path: '.env' });
class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.google_cloud_console_client_email,
                clientId: process.env.google_cloud_console_client_id,
                clientSecret: process.env.google_cloud_console_client_secret,
                refreshToken: process.env.google_cloud_console_refresh_token,
                accessToken: process.env.google_cloud_console_access_token
            }
        });
    }

    async refreshToken() {
        try {
            const response = await axios.post('https://oauth2.googleapis.com/token', {
                client_id: process.env.google_cloud_console_client_id,
                client_secret: process.env.google_cloud_console_client_secret,
                refresh_token: process.env.google_cloud_console_refresh_token,
                grant_type: 'refresh_token'
            });

            if (response.data && response.data.access_token) {
                this.transporter.options.auth.accessToken = response.data.access_token;
            } else {
                throw new Error('No access token found in refresh response');
            }
        } catch (error) {
            console.error('Error refreshing access token:', error);
            throw error; // Re-throwing the error to be caught in sendEmail method
        }
    }

    async sendEmail(to, subject, text) {
        try {
            await this.refreshToken();

            const info = await this.transporter.sendMail({
                from: process.env.google_cloud_console_client_email,
                to: to,
                subject: subject,
                text: text,
            });

            console.log('Message sent:', info.messageId);
        } catch (error) {
            console.error('Error sending email:', error);
        }
    }
}


module.exports = EmailService;
