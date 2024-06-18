import { config } from 'dotenv';
import pkg from '@azure/storage-blob';
const { BlobServiceClient, BlobUploadCommonResponse, ContainerClient } = pkg;
config({ path: '.env' });

export default class Logger {

    constructor() {
        if (Logger.instance) {
            return Logger.instance;
        }
        Logger.instance = this;
    }
    
    error_and_info_regex_pattern = /[a-zA-Z0-9()\[\]'":/.,{} ]{1,1000}/g

    /**
     * The Discord API has a unique way to display dynamic timestamps relative to the time zone that the user is located in. 
     * First, the function gets the current date and time that is the number of milliseconds since midnight on January 01, 1970 UTC.
     * After that, a timestamp is generated in preparation for logging to a Discord channel. Below is the structure used to format Discord relative timestamps:
     * <t:COPIED_TIMESTAMP_HERE:FORMAT>   
        Where is says FORMAT, you can put a few different things:
            R: Relative, says "two weeks ago", or "in 5 years"
            D: Date, says "July 4, 2021"
            T: Time, "11:28:27 AM"
            t: Short Time, "11:28 AM"
            F: Full, "Monday, July 4, 2021 11:28:27 AM"
        View the following Reddit post to make your own time stamps: https://www.reddit.com/r/discordapp/comments/ofsm4e/dynamic_timestamps/
     * @param {*} message 
     * @returns formatted message that includes the UTC date the log was recorded, the log message itself, and an absolute date to display on Discord
     */
    formatDiscordAPIRelativeMessageDate(message) {
        const formatted_error_date_string = new Date();
        const unix_timestamp_current_time = Math.floor(formatted_error_date_string.getTime() / 1000);
        const discord_api_formatted_timestamp = `<t:${unix_timestamp_current_time}:R>`;
        const formatted_message = `${formatted_error_date_string}: ${message}\n${discord_api_formatted_timestamp}`;
        return formatted_message;
    }


    /**
     * Format the date that is displayed before logging messages to be relative to the user's time zone. 
     * @param {string} message the message that will be output to the log file
     * @returns the relative date concatenated with the log message 
     */
    formatLogMessageToRelativeDate(message) {
        const formatted_error_string_date = new Date();
        const timezoneOffset = formatted_error_string_date.getTimezoneOffset();
        const timestamp_adjusted_for_timezone = formatted_error_string_date.getTime() - (timezoneOffset * 60 * 1000);
        const adjusted_date = new Date(timestamp_adjusted_for_timezone);
        const formatted_date = adjusted_date.toLocaleString();
        return `${formatted_date}: ${message}`;
    }

    /**
     * Tests to see if the supplied logging message is valid and follows the following regex pattern: /[a-zA-Z0-9()\[\]'":/.,{} ]{1,1000}/g
     * @param {*} message 
     * @returns 
     */
    validateLogMessageFollowsRegex(message) {
        if (message && message.match(this.error_and_info_regex_pattern)) {
            return true;
        }
        return false;
    }

    sanitizeContainerName(name) {
        return name.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 63);
    }

    sanitizeBlobName(name) {
        return encodeURIComponent(name).slice(0, 1024);
    }

    /**
     * The current ISO date is formatted in the following pattern: YYYY-MM-DD
     * @returns a Date object formatted as ISO
     */
    getCurrentDateISO() {
        // Get current date
        const currentDate = new Date();

        // Format current date to YYYY-MM-DD
        const formattedDate = currentDate.toISOString().split('T')[0];

        return formattedDate;
    }

    /**
     * Writes a file to an Azure storage container that contains text
     * @param {string} logName the log file name
     * @param {string} fileContents Text written to file
     * @param {string} guildId Discord guild id of the user who is using the bot
     * @param {string} containerName Either 'error' or 'info'
     */
    async writeLogToAzureContainer(logName, fileContents, guildId, containerName) {
        const storage_account_connection = process.env.azure_storage_account_connection_string;

        if (!storage_account_connection) {
            throw new Error(`The Azure storage account connection string is undefined`);
        }

        const log_message = this.formatLogMessageToRelativeDate(fileContents);

        // Get the current date in ISO format to use in the blob file name
        const current_iso_date = this.getCurrentDateISO();
        const blob_file_name = `${guildId}-${current_iso_date}-${logName}.log`;

        // Sanitize container and blob names
        const sanitizedContainerName = this.sanitizeContainerName(containerName);
        const sanitizedBlobFileName = this.sanitizeBlobName(blob_file_name);

        // Validate sanitized names
        if (sanitizedContainerName !== containerName || sanitizedBlobFileName !== blob_file_name) {
            console.error(`Invalid container or blob name after sanitization.`);
            return;
        }

        // Create BlobServiceClient from the connection string
        const blob_service_client = BlobServiceClient.fromConnectionString(storage_account_connection);

        // Get a reference to the container
        const container_client = blob_service_client.getContainerClient(sanitizedContainerName);

        try {
            // Ensure the container exists
            await container_client.createIfNotExists();

            // Get a reference to the BlockBlobClient for the specific blob
            const blob_client = container_client.getBlockBlobClient(sanitizedBlobFileName);

            // Check if the blob (log file) already exists
            const blob_client_exists = await blob_client.exists();

            if (blob_client_exists) {
                // If the blob exists, append the new log message to the existing log file contents
                const existing_log_contents = await blob_client.downloadToBuffer();
                const modified_file_contents = existing_log_contents.toString() + '\n' + log_message;
                // Upload the modified contents with overwrite option to replace the existing blob
                await blob_client.uploadData(Buffer.from(modified_file_contents), {
                    overwrite: true
                });
            } else {
                // If the blob does not exist, create a new blob with the log message
                await blob_client.uploadData(Buffer.from(log_message), {
                    overwrite: true
                });
            }
        } catch (error) {
            throw new Error(`There was an error when creating the container or uploading the log file ${logName}: ${error}`);
        }
    }

    /**
     * Reads all log files from a container that was created for a player
     * @param {string} containerName name of container to search for log files 
     */
    async readAllLogsFromAzureContainer(containerName) {
        const storage_account_connection = process.env.azure_storage_account_connection_string;

        if (!storage_account_connection) {
            throw new Error(`The Azure storage account connection string is undefined`);
        }

        const blob_service_client = BlobServiceClient.fromConnectionString(storage_account_connection);
        const container_client = blob_service_client.getContainerClient(containerName);
        const log_files = [];

        // await container_client.createIfNotExists();

        try {
            for await (const blob of container_client.listBlobsFlat()) {
                if (blob.name.endsWith('.log')) {
                    const blob_client = container_client.getBlockBlobClient(blob.name);
                    const download_response = await blob_client.downloadToBuffer();
                    const logContents = download_response.toString();

                    const log_file_data = {
                        name: blob.name,
                        content: logContents
                    }

                    log_files.push(log_file_data);
                }
            } 
            return log_files;
        } catch (error) {
            throw new Error(`An error occurred when attempting to read log files from Azure storage account for container ${container_client}: ${error}`);
        }
    }
}