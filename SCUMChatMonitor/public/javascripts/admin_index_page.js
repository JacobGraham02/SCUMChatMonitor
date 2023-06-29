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
}