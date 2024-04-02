const inputFields = document.querySelectorAll(`.validate-input`);

function addValidationListener(inputField) {
    console.log("addValidationListener");
    const validationPattern = new RegExp(inputField.pattern);

    inputField.addEventListener("input", function() {
        let valueOfInputField = undefined;

        if (this.type === 'number') {
            console.log(this.type);
            valueOfInputField = parseInt(this.value);
        }

        const isValid = validationPattern.test(this.value);

        console.log(this.value);
        console.log(isValid);

        if (isValid) {
            this.classList.remove('is-invalid');
            this.classList.add('is-valid');
        } else {
            this.classList.remove('is-valid');
            this.classList.add('is-invalid');
        }
    });
}

for (let i = 0; i < inputFields.length; i++) {
    addValidationListener(inputFields[i]);
}