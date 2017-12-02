$(function() {
    intializeMIDI();
    $("#start-button").prop("disabled", true);
    $("#stop-button").click(function() {
        stopPlaying();
        $("#stop-button").prop("disabled", true);
        $("#start-button").prop("disabled", false);
    });
    $("#start-button").click(function() {
        beginPlaying();
        $("#stop-button").prop("disabled", false);
        $("#start-button").prop("disabled", true);
    });
});

var pitches = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

function mod(n, m) { return ((n % m) + m) % m; }

/**
 * An array of relative chord names along with their semitonal roots offsets 
 * from the chord root.
 */
var chordOptions = [{name: "I", root: 0}, {name: "ii", root: 2}, 
        {name: "iii", root: 4}, {name: "IV", root: 5}, {name: "V", root: 7},
        {name: "vi", root: 9}, {name: "vii", root: 11}];
var intervalsInKey = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23];

/**
 * This class offers useful note-wise arithmetic.
 */
class Note {
    constructor(noteName) {
        this.pitch = noteName.substring(0, noteName.length - 1);
        this.octave = parseInt(noteName.substring(noteName.length - 1, noteName.length));
    }

    /**
     * Returns a new note offset by a given amount of semitones.
     * @param {*} semitones The number of semitones to offset by.
     */
    getOffset(semitones) {
        var newPitch = this.pitch;
        var newOctave = this.octave;
        var currentIndex = pitches.indexOf(this.pitch);

        var end = semitones + currentIndex;
        if (end < 0)
            newOctave += Math.floor(end / 12);
        else
            newOctave += Math.floor(end / 12);
 
        newPitch = pitches[mod(end, 12)];
        return new Note(newPitch + newOctave.toString());
    }

    setOctave(oct) {
        this.octave = oct;
    }

    getName() {
        return this.pitch + this.octave;
    }
}

/**
 * 
 * Begin functional part of script.
 * 
 */

var globalAttributes = {
    key: "C",
    keyNote: new Note("C3"),
    playing: true,
    tempo: 120
}

/**
 * Values which might be changed through various hand motions.
 */
var variableAttributes = {
    arpComplexity: 0.5,

    // 3 -> triad, 4 -> seventh, etc.
    chordComplexity: 3,
    chordOctave: 2,
    chordLengthBeats: 4,
    chordHitsPerLength: 1,
    // How much of the chord duration is voiced.
    chordStaccato: 0.98,

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

// A bank of chord progressions that could be swapped in at any time.
var chordProgs = [["I", "IV", "V", "I"],
                  ["I", "IV", "V", "IV"],
                  ["vi", "ii", "V", "I"],
                  ["V", "IV", "I", "I"],
                  ["vii", "V", "V", "I"]];
var currentChordProg = chordProgs[0];

/**
 * Called when the music starts playing.
 */
function beginPlaying() {
    globalAttributes.playing = true;
    // NOTE: The playChord function calls other play functions, in order
    // to avoid everything getting out of sync.
    setTimeout(function() { playChord(); }, 0);
}

function stopPlaying() {
    globalAttributes.playing = false;
}

/**
 * Plays a sequence of notes in a given channel, synchronously times.
 * 
 * @param {*} channel The channel object we're playing the notes in.
 * @param {*} notes An array of objects in order, where each object is
 *                  like {noteName, duration(beats)}.
 */
function voiceMelody(channel, notes) {
    if (notes.length == 0) return;
    voiceNote(channel, notes[0].noteName, notes[0].duration);
    setTimeout(function() {
        voiceMelody(channel, notes.slice(1));
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

/**
 * Voices a chord given a chord name (like "vi", etc.)
 * @param {String} chordName The roman chord name.
 * @param {int} rootOctave The octave to begin the chord in.
 * @param {int} complexity How many notes from the root to go (can't be > 6).
 */
function voiceKeyChord(channelName, chordName, rootOctave, complexity, duration) {
    var notes = [];
    var inChord = notesInChord(chordName, rootOctave);
    
    for (var i = 0; i < complexity; i++) {
        notes.push(inChord[i].getName());
    }
    voiceChord(channelName, notes, duration);
}

function voiceChord(channelName, notes, duration) {
    var c = $.grep(channels, function(e){ return e.name == channelName })[0];
    var chord = notes.map(function(n) { return MIDI.keyToNote[n]; });
    var millisDur = beatsToMillis(duration);

    MIDI.chordOn(c.channel, chord, c.velocity, 0);
    setTimeout(function() { MIDI.chordOff(c.channel, chord, 0) }, millisDur);
}

function beatsToMillis(beats) {
    return beats * (1000.0 / (globalAttributes.tempo / 60.0));
}

/**
 * Gets an array of notes which make up a given chord, whose root is in the
 * given start octave. The array contains upper notes (7, 9th, 11th, 13th, etc).
 * @param {*} chord The chord, chosen from the list of chordOptions.
 * @param {*} startOctave The octave that the chord root lies in.
 */
function notesInChord(chord, startOctave) {
    var chordFromString = $.grep(chordOptions, function(c){ return c.name == chord })[0];
    var chordRoot = globalAttributes.keyNote.getOffset(chordFromString.root);

    var intervalsToNotes = function(ints) {
        return ints.map(function(interval) {
            chordRoot.setOctave(startOctave);
            return chordRoot.getOffset(interval);
        });
    }
    // Here, you could define more chords (like jazz chords), if you wanted.
    switch(chord){
        case "I": return intervalsToNotes([0, 4, 7, 11, 14, 17]);
        case "ii": return intervalsToNotes([2, 5, 9, 12, 16, 19]);
        case "iii": return intervalsToNotes([4, 7, 11, 14, 17, 21]);
        case "IV": return intervalsToNotes([5, 9, 12, 16, 19, 23]);
        case "V": return intervalsToNotes([7, 11, 14, 17, 21, 24]);
        case "vi": return intervalsToNotes([9, 12, 16, 19, 23, 26]);
        case "vii": return intervalsToNotes([11, 14, 17, 21, 24, 28]);
        default: return [];
    }
}

/**
 * The play function for the chord channel.
 */
function playChord() {
    // The index in the chord progression we're playing.
    var progPosition = 0;

    var numHitsAtPosition = 0;

    // The duration (in decimal beats) that a single HIT of a chord is played.
    var chordHitDuration = variableAttributes.chordStaccato * 
            (variableAttributes.chordLengthBeats / variableAttributes.chordHitsPerLength);

    var loop = function() {
        voiceKeyChord("chord", currentChordProg[progPosition], 
            variableAttributes.chordOctave, variableAttributes.chordComplexity,
            chordHitDuration);
        // Update a couple of counters.
        numHitsAtPosition++;
        if (numHitsAtPosition == variableAttributes.chordHitsPerLength) {
            numHitsAtPosition = 0;
            progPosition++;
        }
        if (progPosition == currentChordProg.length) {
            progPosition = 0;
        }
        

        setTimeout(function() {
            if (globalAttributes.playing)
                loop();
        }, beatsToMillis(variableAttributes.chordLengthBeats / variableAttributes.chordHitsPerLength));
    }
    loop();
}

/**
 * The play function for the arpeggiator channel.
 */
function playArp() {

}

/**
 * Chooses a chord via a 
 */
function chooseChord() {

}