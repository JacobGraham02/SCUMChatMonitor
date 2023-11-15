const cancel_command_button = document.querySelector('#cancel_changes_to_command_button');

cancel_command_button.addEventListener('click', () => {
    history.back();
});