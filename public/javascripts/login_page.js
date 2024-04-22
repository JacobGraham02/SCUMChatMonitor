document.addEventListener("DOMContentLoaded", function() {
    const login_button = document.querySelector("#button_submit_login");
    const email_input = document.getElementById("form_login_username_input");
    const password_input = document.getElementById("form_login_password_input");

    login_button.addEventListener("click", async function() {
        const email = email_input.value;
        const password = password_input.value;
        const login_response = await window.electronAPI.checkLoginCredentials(email, password);
        
        if (login_response.success === true) {
            await window.electronAPI.createLoginWebsocket(login_response);
        }
    });
});