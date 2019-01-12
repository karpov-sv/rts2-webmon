$(document).ready(function(){
    // Hackish way to know where the root of our installation is visible
    root = window.location.pathname;

    monitor = new Monitor("#contents-wide", root=root);
    document.title = "RTS2 WebMon";
});
