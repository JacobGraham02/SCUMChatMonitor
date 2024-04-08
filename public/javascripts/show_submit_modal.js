document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById('game_server_data_form');
    const submitButton = document.getElementById('save_changes_to_ftp_server_data_button');
    const modal = $('#submitFormModal'); // Using jQuery for Bootstrap modal
    const modalSubmitButton = document.getElementById('submitButton');

    submitButton.addEventListener('click', function(event) {
        event.preventDefault(); 
        modal.modal('show'); // Show the modal
    });

    modalSubmitButton.addEventListener('click', function() {
        form.submit(); // Submit the form
    });
});