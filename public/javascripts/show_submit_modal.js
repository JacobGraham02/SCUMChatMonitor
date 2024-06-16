document.addEventListener("DOMContentLoaded", function() {
    const form = document.querySelector(".bot_data_form");
    const submitButton = document.getElementById('save_changes_button');
    const cancelButton = document.getElementById('cancel_changes_button');
    const modal = $('#submitFormModal'); // Using jQuery for Bootstrap modal
    const modalSubmitButton = document.getElementById('submitButton');
    const cancelModal = $('#cancelModal'); // Using jQuery for Bootstrap modal
    const cancelModalConfirmButton = document.getElementById("confirmCancelButton");

    submitButton.addEventListener('click', function(event) {
        event.preventDefault(); 
        modal.modal('show'); // Show the modal
    });

    modalSubmitButton.addEventListener('click', function() {
        form.submit(); // Submit the form
    });

    cancelButton.addEventListener('click', function(event) {
        event.preventDefault();
        cancelModal.modal('show');
    });

    cancelModalConfirmButton.addEventListener('click', function() {
        window.history.back();
    });

    // Check for the presence of modals on the page
    if(document.getElementById('successModal')) {
        $('#successModal').modal('show');
    }

    if(document.getElementById('errorModal')) {
        $('#errorModal').modal('show');
    }
});
