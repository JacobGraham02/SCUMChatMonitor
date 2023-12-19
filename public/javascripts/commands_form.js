const cancel_command_button = document.querySelector('#cancel_changes_to_command_button');
const advanced_command_button = document.querySelector('#toggle_advanced_command_mode_button');
const easy_command_button = document.querySelector('#toggle_easy_command_mode_button');
const advanced_create_command_section = document.querySelector('#new_command_section_advanced');
const easy_create_command_section = document.querySelector('#new_command_section_easy');
const create_command_form = document.querySelector('#create_commands_file_form_advanced');

cancel_command_button.addEventListener('click', () => {
    history.back();
});

advanced_command_button.addEventListener('click', () => {
    advanced_command_button.classList.add('advancedCommandCreationButtonSelected');
    easy_command_button.classList.remove('easyCommandCreationButtonSelected');
    advanced_create_command_section.style.display = 'block';
    easy_create_command_section.style.display = 'none';
});

easy_command_button.addEventListener('click', () => {
    advanced_command_button.classList.remove('advancedCommandCreationButtonSelected');
    easy_command_button.classList.add('easyCommandCreationButtonSelected');
    easy_create_command_section.style.display = 'block';
    advanced_create_command_section.style.display = 'none';
});