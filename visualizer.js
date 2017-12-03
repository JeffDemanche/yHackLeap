var spectrum = ["red", "orange", "yellow", "GreenYellow", "green", "blue", "purple", "DarkRed"]

$(function() {
    for (var note = 0; note < 8; note++) {
        $("#light-bar").append($("<div id=\"note-" + note + "\" class=\"light\"></div>"));
    }
});

function light(index) {
    $("#note-" + index).css('background-color', spectrum[index]);
    $("#note-" + index).addClass("lit");
    setTimeout(function() {
        $("#note-" + index).css('background-color', 'black');
        $("#note-" + index).removeClass("lit");
    }, 100);
}