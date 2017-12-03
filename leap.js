var controller = Leap.loop({enableGestures:true}, function(frame) {
    if (frame.hands.length > 0) {
        if (frame.hands.length == 1) {
            harmChannel.velocity = 0;
            brassChannel.velocity = 0;
        } else if (frame.hands.length == 2) {
            brassChannel.velocity = 150;
            harmChannel.velocity = 150;
        }

        var hand = frame.hands[0];
        var handPos = hand.palmPosition;
        var handHeight = handPos[1];
        var sphereRadius = hand.sphereRadius;

        var staccatoValue = Math.min(1.0, handHeight / 600.0);
        var sphereFixedValue = Math.floor(sphereRadius / 30);

        setHTMLInfo("hand-height", staccatoValue.toFixed(2));
        setHTMLInfo("sphere-radius", sphereFixedValue);
        
        setMusicAttr("arpStaccato", staccatoValue);
        setMusicAttr("chordStaccato", staccatoValue);
        setMusicAttr("bassStaccato", staccatoValue);

        setMusicAttr("chordComplexity", sphereFixedValue);
        setMusicAttr("arpComplexity", Math.pow(2, Math.min(2, sphereFixedValue-1)));

        var index = hand.indexFinger;
        var indexMatrix = index.proximal.basis[1];
        var indexBend = indexMatrix[2];
        indexBend += 1.0;
        indexBend *= 100.0;

        setHTMLInfo("index-bend", indexBend.toFixed(2));
        arpChannel.velocity = Math.floor(indexBend);

        var roll = hand.roll();
        roll /= Math.PI;
        roll = Math.abs(roll);
        roll *= 200;

        setHTMLInfo("hand-roll", roll.toFixed(2));
        chordChannel.velocity = Math.floor(roll);

        //var ring = hand.ringFinger;

        var pinky = hand.pinky;
        var pinkyMatrix = pinky.proximal.basis[1];
        var pinkyBend = pinkyMatrix[2];
        pinkyBend += 1.0;
        pinkyBend *= 120.0;

        setHTMLInfo("pinky-bend", pinkyBend.toFixed(2));
        bassChannel.velocity = Math.floor(pinkyBend);
    }
});

function setMusicAttr(attrName, value) {
    variableAttributes[attrName] = value;
}

function setHTMLInfo(infoName, value) {
    $("#" + infoName).html(value.toString());
}