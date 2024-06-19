document.addEventListener('DOMContentLoaded', function() {
    // Query all input fields needing validation
    const inputFields = document.querySelectorAll('.validate-input');

    // Function to add validation listeners to an input field
    function addValidationListener(inputField) {
        // Create a RegExp object for validating the input field based on its 'pattern' attribute
        const validationPattern = new RegExp(inputField.pattern);

        // Listener for changes to the input field's value (as the user types)
        inputField.addEventListener("input", () => validateInput(inputField, validationPattern));
        
        // Initial validation check
        validateInput(inputField, validationPattern);
    }

    // Function to validate an input field and apply visual feedback
    function validateInput(inputField, validationPattern) {
        const feedbackElement = document.getElementById(inputField.id + '_feedback');
        let value = inputField.value;

        // Special handling for number inputs
        if (inputField.type === 'number') {
            value = parseInt(value);
        }

        // Check if the input value matches the pattern
        const isValid = validationPattern.test(inputField.value);

        // Apply visual feedback based on validity
        if (isValid) {
            inputField.classList.remove('is-invalid');
            inputField.classList.add('is-valid');
            if (feedbackElement) {
                feedbackElement.classList.add('is-valid-feedback');
                feedbackElement.textContent = "Valid"
            }
        } else {
            inputField.classList.remove('is-valid');
            inputField.classList.add('is-invalid');
            if (feedbackElement) {
                feedbackElement.classList.add('is-invalid-feedback');
                feedbackElement.textContent = "Invalid"
            }
        }
    }

    // Apply the validation listener to each input field
    inputFields.forEach(addValidationListener);
});