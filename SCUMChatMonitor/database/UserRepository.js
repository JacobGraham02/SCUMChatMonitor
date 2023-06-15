module.exports = class IUserRepository {

    async findUserById(user_id) {
        const user = await database.query('SELECT * FROM users WHERE id = ?', [user_id]);
        return user;
    }

    async findAllUsers() {
        const users = await database.query('SELECT * FROM users');
        return users;
    }

    async findAllAdministrators() {
        const administrators = await database.query('SELECT * FROM administrators');
        return administrators;
    }

    async createUser(user_data) {
        const create_user_result = await database.query('INSERT INTO users SET ?', [user_data])
        return create_user_result.insertId;
    }

    async updateUser(user_id, user_data) {
        const update_user_result = await database.query('UPDATE users SET ? WHERE id = ?', [user_data, user_id])
        return update_user_result.affectedRows > 0;
    }

    async deleteUser(user_id) {
        const delete_user_result = await database.query('DELETE FROM users WHERE id = ?', [user_id]);
        return delete_user_result.affectedRows > 0;
    }

    async createCommand(command_data) {
        const create_command_result = await database.query('INSERT INTO commands SET ?', [command_data]);
        return create_command_result.insertId;
    }

    async editCommand(command_id, command_data) {
        const update_command_result = await database.query('UPDATE commands SET ? WHERE id = ?', [command_data, command_id]);
        return update_command_result.affectedRows > 0;
    }

    async deleteCommand(command_id) {
        const delete_command_result = await database.query('DELETE FROM commands WHERE id=?', [command_id]);
        return delete_command_result.affectedRows > 0;
    }
}