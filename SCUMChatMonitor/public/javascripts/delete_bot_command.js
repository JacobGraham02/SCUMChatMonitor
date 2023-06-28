window.onload = function () {

    const delete_links = document.querySelectorAll('.bot_command_list_item_delete');

    delete_links.forEach(function (link) {
        link.addEventListener('click', function (event) {
            event.preventDefault();


            fetch(this.getAttribute('href'), {
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
        });
    });
}