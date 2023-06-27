const fs = require('fs');
const path = require('path');

function fetchCommandDataFromCommand(command_file_contents) {
    const command_data_regex_pattern = /command_data:\s*'([\s\S]*?)',/;
    const command_data_text_exists = command_data_regex_pattern.exec(command_file_contents);
    const command_data_from_command = command_data_text_exists ? command_data_text_exists[1] : '';
    return command_data_from_command;
}

function fetchAuthorizationRolesFromCommand(command_file_contents) {
    const authorization_role_name_regex_pattern = /authorization_role_name:\s*\[(.*?)\],/;
    const authorization_role_name_exists = authorization_role_name_regex_pattern.exec(command_file_contents);
    const authorization_role_data_from_command = authorization_role_name_exists ? authorization_role_name_exists[1].split(',') : [];
    return authorization_role_data_from_command;
}

exports.fetchCommandDataFromCommand = fetchCommandDataFromCommand;
exports.fetchAuthorizationRolesFromCommand = fetchAuthorizationRolesFromCommand;