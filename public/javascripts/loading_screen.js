// Show loading screen
function showLoadingScreen() {
    document.getElementById('loading-screen').style.display = 'flex';
}
  
  // Hide loading screen
function hideLoadingScreen() {
    document.getElementById('loading-screen').style.display = 'none';
}
  
  // Show loading screen when navigating to the newcommand page
window.addEventListener('beforeunload', function() {
    showLoadingScreen();
});
  
  // Hide loading screen once the page is fully loaded
window.addEventListener('load', function() {
    hideLoadingScreen();
});