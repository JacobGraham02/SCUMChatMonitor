@REM @echo on
@REM echo Starting the application
@REM pm2 start scumchatmonitor.exe --interpreter none
@REM echo The application is now running. Displaying pm2 status 
@REM pm2 status
@REM echo These lines appear to notify you that the application is now running in the background as a daemon thread. Press any key to continue and starting showing pm2 logs
@REM pause
@REM pm2 logs scumchatmonitor.exe
@REM pm2 save
