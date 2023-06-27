const time_until_logout_milliseconds = 10800000; // 3 hours in milliseconds ; 10,800,000

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', resetIdleTimer);
    document.addEventListener('wheel', resetIdleTimer);
    document.addEventListener('keydown', resetIdleTimer);

    localStorage.setItem("expiredTime", time_until_logout_milliseconds);
    startTimeoutForIdle();
});

function startTimeoutForIdle() {
    return setInterval(() => {
        addIdleTime(1000);
    }, 1000);
}

function addIdleTime(time) {
    let extra_idle_time = parseInt(localStorage.getItem("expiredTime"));
    console.log(`Extra idle time: ${extra_idle_time}`);
    if (extra_idle_time <= 0) {
        window.location.replace('/login');
        console.log(`Extra idle time is ${extra_idle_time}`);
    }
    extra_idle_time -= time;
    localStorage.setItem("expiredTime", extra_idle_time);
}

function resetIdleTimer() {
    let idle_interval = startTimeoutForIdle();
    clearInterval(idle_interval);
    localStorage.setItem('expiredTime', time_until_logout_milliseconds);
}