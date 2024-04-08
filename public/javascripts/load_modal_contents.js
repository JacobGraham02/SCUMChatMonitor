document.addEventListener('DOMContentLoaded', function() {
    const logFileLinks = document.querySelectorAll('.log-file-link');
    const logFileModalTitle = document.getElementById('logFileModalLabel');
    const logFileContents = document.getElementById('logFileContents');

    logFileLinks.forEach(function(link) {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const logName = this.getAttribute('data-log-name');
            const logContent = this.getAttribute('data-log-content');

            // Update modal title and content
            logFileModalTitle.textContent = 'Log File Content - ' + logName;
            logFileContents.textContent = logContent;
        });
    });
});
