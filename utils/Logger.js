const fs = require('fs');

module.exports = class Logger {
    constructor(logFilePath) {
        this.logFilePath = logFilePath;
    }

    logError(error) {
        const errorMessage = `${new Date().toISOString()}: ${error.stack || error}\n`;

        // Create or append to the error log file
        fs.appendFile(this.logFilePath, errorMessage, (err) => {
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