import { config } from 'dotenv';
config({ path: '.env' });

import fs from 'fs';

export default class Logger {
    constructor() {
        this.log_file_errors_path = process.env.scumbot_error_log_path;
        this.log_file_messages_path = process.env.scumbot_message_log_path;
    }

    logError(error) {
        const error_message = `${new Date().toISOString()}: ${error.stack || error}\n`;

        if (this.log_file_errors_path === undefined) {
            console.log('Log file path is undefined for log error');
            return
        }

        // Create or append to the error log file
        fs.appendFile(this.log_file_errors_path, error_message, (err) => {
            if (err) {
                console.error('Error writing to error log file:', err);
            }
        });

        // Log the error to the console
        console.error('Uncaught Exception or Unhandled Rejection:', error);
    }

    
    logMessage(message) {
        const log_message = `${new Date().toISOString()}: ${message}\n`;

        if (this.log_file_messages_path === undefined) {
            console.log('Log file path is undefined for log message');
            return
        }

        // Create or append to the error log file
        fs.appendFile(this.log_file_messages_path, log_message, (err) => {
            if (err) {
                console.error('Error writing to message log file:', err);
            }
        });
    }

    logExit(code) {
        console.log(`Process exited with code ${code}`);
    }
}