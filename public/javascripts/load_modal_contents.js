document.addEventListener('DOMContentLoaded', () => {
    // Select all log file links
    const logFileLinks = document.querySelectorAll('.log-file-link');
    const downloadButton = document.getElementById('downloadButton');

    logFileLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Extract log file name and content from data attributes
            const logName = link.getAttribute('data-log-name');
            const logContent = link.getAttribute('data-log-content');
            
            // Update modal title and body with log file name and content
            document.getElementById('logFileModalLabel').textContent = logName;
            document.getElementById('logFileContents').textContent = logContent;
            
            // Create a Blob with the log file content
            const blob = new Blob([logContent], {type: "text/plain"});
            
            // Create a URL for the Blob
            const url = window.URL.createObjectURL(blob);
            
            // Update the download button's href and download attributes
            downloadButton.href = url;
            downloadButton.setAttribute('download', logName);

            // Add an event listener to revoke the created URL after the download starts
            downloadButton.addEventListener('click', () => URL.revokeObjectURL(url), {once: true});
        });
    });
});
