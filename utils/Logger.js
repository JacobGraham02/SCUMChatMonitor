const fs = require('fs');

module.exports = class Logger {
    constructor() {
        this.log_file_path = 'C:\\Users\\Wilson\\Desktop\\ScumChatMonitorErrors.txt';
    }

    logError(error) {
        const error_message = `${new Date().toISOString()}: ${error.stack || error}\n`;

        if (this.log_file_path === undefined) {
            console.log('Log file path is undefined');
            return
        }

        // Create or append to the error log file
        fs.appendFile(this.log_file_path, error_message, (err) => {
            if (err) {
                console.error('Error writing to error log file:', err);
            }
        });

        // Log the error to the console
        console.error('Uncaught Exception or Unhandled Rejection:', error);
    }

    logExit(code) {
        console.log(`Process exited with code ${code}`);
    }
}