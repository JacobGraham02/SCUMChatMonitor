document.addEventListener('DOMContentLoaded', function() {
    const menuBtn = document.querySelector('#menu-btn'); 
    menuBtn.addEventListener('change', function() {
        if (this.checked) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    });
});