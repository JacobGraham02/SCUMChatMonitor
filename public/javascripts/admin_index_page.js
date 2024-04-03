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

    /*
    Integration of button sort for ascending and descending command names
    */
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

        /*
        Re-render the sorted items into the DOM
        */
        const parent = document.querySelector('#bot_command_list');
        commands_array.forEach(command => parent.appendChild(command));
    };

    /*
    Trigger the elements sorting based on whether a sort ascending or sort descending button was clicked
    */
    if (sort_ascending_button) {
        sort_ascending_button.addEventListener('click', () => sortCommands(true));
    }
    if (sort_descending_button) {
        sort_descending_button.addEventListener('click', () => sortCommands(false));
    }

    sortCommands(true);

    const searchInput = document.querySelector('#search_input');
    const commandListItems = document.querySelectorAll('.bot_command_list_item_edit_li'); // Assuming these are the items you want to show/hide

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.trim().toUpperCase(); // Convert search term to upper case for case-insensitive matching

        commandListItems.forEach(item => {
            const commandName = item.querySelector('.bot_command_list_item_edit').innerText.toUpperCase(); // Assuming this is where the command name is stored
            const shouldShow = commandName.includes(searchTerm) || searchTerm === ''; // Show item if it includes the search term or if the search term is empty
            item.style.display = shouldShow ? '' : 'none'; // Use the 'display' property to hide or show the item
        });
    });
}