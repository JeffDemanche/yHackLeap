var globalAttributes = {
    key: "C",
    tempo: 120
}

/**
 * Values which might be changed through various hand motions.
 */
var variableAttributes = {
    arpComplexity: 0.5,
    chordComplexity: 0.5,
    rhythmComplexity: 0.5
}

/** Correlate to soundfont files from /soundfont */
var sfInstruments = ['acoustic_bass', 'acoustic_grand_piano', 'cello',
    'orchestral_harp', 'violin'];

var bassChannel = { name: "bass", channel: 0, instr: 'acoustic_bass', velocity: 100 };
var chordChannel = { name: "chord", channel: 1, instr: 'cello', velocity: 100 };
var arpChannel = { name: "arp", channel: 2, instr: 'orchestral_harp', velocity: 100 };
var harmChannel = { name: "harm", channel: 3, instr: 'violin', velocity: 100 };

var channels = [bassChannel, chordChannel, arpChannel, harmChannel];

$(function() {
    intializeMIDI();
});

function intializeMIDI() {
    MIDI.loadPlugin({
        instruments: sfInstruments,
        onsuccess: function() {
            console.log("Loaded MIDI.js");

            var channelsLoaded = 0;
            channels.forEach(function(c) {
                MIDI.loadResource({
                    instrument: c.instr,
                    onsuccess: function() {
                        MIDI.programChange(c.channel, MIDI.GM.byName[c.instr].number, 0);
                        channelsLoaded++;
                        if (channelsLoaded == channels.length)
                            beginPlaying();
                    }
                });
            }, this);
            
        }
    })
}

function beginPlaying() {
    var seq = [{noteName: "A4", duration: 0.25}, {noteName: "B4", duration: 0.25},
        {noteName: "C4", duration: 0.25}, {noteName: "B4", duration: 0.25}];
    playMelody("bass", seq, null);
}

/**
 * Plays a sequence of notes in a given channel, synchronously times.
 * 
 * @param {*} channel The channel object we're playing the notes in.
 * @param {*} notes An array of objects in order, where each object is
 *                  like {noteName, duration(beats)}.
 */
function playMelody(channel, notes) {
    if (notes.length == 0) return;
    voiceNote(channel, notes[0].noteName, notes[0].duration);
    setTimeout(function() {
        playMelody(channel, notes.slice(1));
    }, beatsToMillis(notes[0].duration));
}

/**
 * @param {*} channelName The name of the channel as defined in channel object.
 * @param {*} noteName The string name of the note (i.e. "A4").
 * @param {*} duration The duration of the voiced note, in beats at current tempo.
 * @param {*} velocity The velocity of the note, from 0 to 100.
 */
function voiceNote(channelName, noteName, duration) {
    var c = $.grep(channels, function(e){ return e.name == channelName })[0];
    var note = MIDI.keyToNote[noteName];
    var millisDur = beatsToMillis(duration);

    MIDI.noteOn(c.channel, note, c.velocity, 0);
    setTimeout(function() { MIDI.noteOff(c.channel, note, 0) }, millisDur);
}

function beatsToMillis(beats) {
    return beats * (1000.0 / (globalAttributes.tempo / 60.0));
}