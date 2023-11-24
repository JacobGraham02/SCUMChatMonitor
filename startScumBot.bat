@echo on
echo Starting the application
pm2 start app.js
echo The application is now running. Displaying pm2 status 
pm2 status
echo These lines appear to notify you that the application is now running in the background as a daemon thread. Press any key to continue and starting showing pm2 logs
pause
pm2 logs