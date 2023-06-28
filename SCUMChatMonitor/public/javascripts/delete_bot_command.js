document.querySelector('#bot_command_list_item_delete').addEventListener('click', function (event) {
    event.preventDefault();

    fetch(this.getAttribute('href'), {
        method: 'DELETE',
    }).then(response => {

        if (!response.ok) throw new Error('Error: ' + response.status);
        console.log('File deleted successfully');
        return response.text();
    }).catch(err => {

        console.error('Error occurred', err);
    });
});