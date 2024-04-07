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
});