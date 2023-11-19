CREATE DATABASE ScumChatMonitor;
USE ScumChatMonitor;

-- Will be the initial table that is populated when a user first creates an account. The date and time the user created their account must
-- be recorded 
CREATE TABLE user (
 id VARCHAR(36) PRIMARY KEY,
 created_at TIMESTAMP DEFAULT current_timestamp
);

-- Will store the credentials that a user logs in to their web bot interface with. 
-- Has a key reference back to the user table so a specific user can be identified with their credentials
CREATE TABLE user_credentials (
 id VARCHAR(36) PRIMARY KEY,
 user_credentials_id VARCHAR(36) NOT NULL, 
 username VARCHAR(128) NOT NULL UNIQUE,
 password VARCHAR(128) NOT NULL UNIQUE,
 FOREIGN KEY(user_credentials_id) REFERENCES user(id)
);

-- This table holds all of the relevant fields in that will allow a player to execute a specific bot commands on their SCUM server
-- The 'authorized_role_name' is for future additions when the bot is fully integrated into Discord, allowing admins to restrict
-- which users are allowed to use the bot
CREATE TABLE user_commands (
  id VARCHAR(36) PRIMARY KEY,
  user_command_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL UNIQUE,
  command_data TEXT NOT NULL UNIQUE,
  authorization_role_name TEXT NOT NULL,
  command_cost MEDIUMINT UNSIGNED NOT NULL,
  FOREIGN KEY(user_command_id) REFERENCES user(id)
);

-- This table holds all of the relevant fields that will trigger a message to be sent to the entire server at a specific time 
-- every day. This is useful for commands such as restart commands. 
CREATE TABLE bot_messages_to_send (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  message_to_send TEXT NOT NULL UNIQUE,
  time_to_send_24_hour_time TIME NOT NULL
);