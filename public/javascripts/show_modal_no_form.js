document.addEventListener("DOMContentLoaded", function() {
    // Automatically show the success modal if it exists
    if ($('#successModal').length) {
        $('#successModal').modal('show');
    }

    // Automatically show the error modal if it exists
    if ($('#errorModal').length) {
        $('#errorModal').modal('show');
    }
});
