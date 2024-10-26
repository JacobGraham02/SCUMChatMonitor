document.addEventListener("DOMContentLoaded", function() {
    const deleteForm = document.querySelector("#delete_commands_form");
    const deleteButton = document.querySelector("#save_changes_button");
    const checkboxes = document.querySelectorAll('input[type="checkbox"][name="command_names_checkbox"]');

    function updateDeleteButtonState() {
        const areCheckboxesChecked = Array.from(checkboxes).some(checkbox => checkbox.checked);
        deleteButton.disabled = !areCheckboxesChecked;
    }

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateDeleteButtonState);
    });

    updateDeleteButtonState();
});