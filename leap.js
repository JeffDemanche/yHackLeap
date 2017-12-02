var controller = Leap.loop({enableGestures:true}, function(frame) {
    if (frame.hands.length > 0) {
        var hand = frame.hands[0];
        var handPos = hand.palmPosition;
        var handHeight = handPos[1];
        var staccatoValue = Math.min(1.0, handHeight / 400.0);

        setHTMLInfo("hand-height", staccatoValue.toFixed(2));
        
        setMusicAttr("arpStaccato", staccatoValue);
        setMusicAttr("chordStaccato", staccatoValue);
        setMusicAttr("bassStaccato", staccatoValue);

        var index = hand.indexFinger;
        var middle = hand.middleFinger;
        var ring = hand.ringFinger;
        var pinky = hand.pinky;

    }
    else {
        // No hand found.
    }
});

function setMusicAttr(attrName, value) {
    variableAttributes[attrName] = value;
}

function setHTMLInfo(infoName, value) {
    $("#" + infoName).html(value.toString());
}