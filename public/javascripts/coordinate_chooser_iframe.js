document.addEventListener('DOMContentLoaded', function() {
    const coordinate_data_form = document.querySelector("#coordinate_data_form");
    const toggle_map_view_button = document.querySelector("#toggle_map_view_button"); 
    const toggle_form_view_button = document.querySelector("#toggle_form_view_button");
    const map_selection_tool = document.querySelector("#map_selection_tool");

    // Initially hide the form
    coordinate_data_form.style.display = "none";

    // Hide the form and show the map when the "Show Map" button is clicked
    toggle_map_view_button.addEventListener("click", function() {
        map_selection_tool.style.display = "block";
        coordinate_data_form.style.display = "none";
        this.style.display = "none"; // Hide "Show Map" button
        toggle_form_view_button.style.display = "inline-block"; // Show "Show Form" button
    });

    // Hide the map and show the form when the "Show Form" button is clicked, and call testF
    toggle_form_view_button.addEventListener("click", function() {
        coordinate_data_form.style.display = "block";
        map_selection_tool.style.display = "none";
        this.style.display = "none"; // Hide "Show Form" button
        toggle_map_view_button.style.display = "inline-block"; // Show "Show Map" button
    });

    /*
    The current clipboard contains text in the following format: "#Teleport xx.xx yy.yy zz.zz"
    Therefore, to get individual components of the string, we must split the string on spaces, and store
    the individual parts in an array. Then, we can supply the strings located at the array element locations.
    The teleport command format will always be the same, so it is safe to access array indices directly
    without worrying about the wrong data. 
    */  
    coordinate_data_form.addEventListener("paste", function(event) {
        const paste_text = (event.clipboardData).getData('text');
        if (paste_text.startsWith("#Teleport")) {
            const coordinate_text = paste_text.split(" ")
            const x_coordinate_input = document.querySelector("#x_coordinate_input");
            const y_coordinate_input = document.querySelector("#y_coordinate_input");
            const z_coordinate_input = document.querySelector("#z_coordinate_input");
            x_coordinate_input.value = coordinate_text[1].trim();
            y_coordinate_input.value = coordinate_text[2].trim();
            z_coordinate_input.value = coordinate_text[3].trim();
        }
    });
});