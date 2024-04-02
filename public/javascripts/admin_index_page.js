window.onload = function () {
    const delete_links = document.querySelectorAll('.bot_command_list_item_delete');

    delete_links.forEach(function (link) {
        link.addEventListener('click', function (event) {
            event.preventDefault();

            const file_href = this.getAttribute('href');
            const command_name = file_href.split('/').pop();

            const confirm_delete_command = confirm(`Are you sure you want to delete the command ${command_name}?`);

            if (confirm_delete_command) {
                fetch(file_href, {
                    method: 'DELETE',
                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Error: ${response.status}`);
                        }
                        console.log(`The file was successfully deleted. Status of the response: ${response.status}`);
                        window.location.reload();
                        return response.text();
                    })
                    .catch(error => {
                        console.error(`An error has occurred when attempting to delete this file: ${error}`);
                    });
            }
        });
    });

    // Integration of sorting functionality
    const sort_ascending_button = document.querySelector('#sort_ascending');
    const sort_descending_button = document.querySelector('#sort_descending');
    const command_list = document.querySelector('#bot_command_list').querySelectorAll('li');
    let commands_array = Array.from(command_list);

    const sortCommands = (ascending = true) => {
        commands_array.sort((a, b) => {
            const textA = a.querySelector('.bot_command_list_item_edit').innerText.toUpperCase();
            const textB = b.querySelector('.bot_command_list_item_edit').innerText.toUpperCase();
            return ascending ? textA.localeCompare(textB) : textB.localeCompare(textA);
        });

        // Re-attach sorted items to the DOM
        const parent = document.querySelector('#bot_command_list');
        commands_array.forEach(command => parent.appendChild(command));
    };

    // Event listeners for sorting
    if (sort_ascending_button) {
        sort_ascending_button.addEventListener('click', () => sortCommands(true));
    }
    if (sort_descending_button) {
        sort_descending_button.addEventListener('click', () => sortCommands(false));
    }
}