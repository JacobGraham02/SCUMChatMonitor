const fs = require('fs');
const path = require('path');

const test_string = `module.exports = {
    data: new SlashCommandBuilder()
        .setName('discord')
        .setDescription('Generates a link for discord')
        .addStringOption(options =>
            options.setName('test_option')
                .setDescription('The description of test option')),
    command_data: 'Discord: https://test.com',
    authorization_role_name: ["Admin"],

    async execute(message) {
        
    }
}`;

const command_data_regex_pattern = /command_data:\s*'([\s\S]*?)',/;
const authorization_role_name_regex_pattern = /authorization_role_name:\s*\[(.*?)\],/;

function fetchCommandDataFromCommand(command_file_contents) {
    const command_data_text_exists = command_data_regex_pattern.exec(javascript_file_contents);
    const command_data_from_command = command_data_text_exists ? command_data_text_exists[1] : '';
    return command_data_from_command;
}

function fetchAuthorizationRolesFromCommand(command_file_contents) {
    const authorization_role_name_exists = authorization_role_name_regex_pattern.exec(javascript_file_contents);
    const authorization_role_data_from_command = authorization_role_name_exists ? authorization_role_name_exists[1].split(',') : [];
    return authorization_role_data_from_command;
}

exports.fetchCommandDataFromCommand = fetchCommandDataFromCommand;
exports.fetchAuthorizationRolesFromCommand = fetchAuthorizationRolesFromCommand;