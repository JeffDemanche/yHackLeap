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

    $("body").keypress(function(event) {
        switch(event.which) {
            // q
            case 119: currentChordProg = chordProgs[0]; break;
            // w
            case 101: currentChordProg = chordProgs[1]; break;
            // e
            case 114: currentChordProg = chordProgs[2]; break;
            // r
            case 113: currentChordProg = chordProgs[3]; break;
            // t
            case 121: currentChordProg = chordProgs[4]; break;

            // a
            case 97: currentArpPattern = arpPatterns[0]; break;
            // s
            case 115: currentArpPattern = arpPatterns[1]; break;
            // d
            case 100: currentArpPattern = arpPatterns[2]; break;
            // f
            case 102: currentArpPattern = arpPatterns[3]; break;
            // g
            case 103: currentArpPattern = arpPatterns[4]; break;

            // z
            case 122: currentBassSequence = bassSequences[0]; break;
            // x
            case 120: currentBassSequence = bassSequences[1]; break;
            // c
            case 99: currentBassSequence = bassSequences[2]; break;
            // v
            case 118: currentBassSequence = bassSequences[3]; break;
        }
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

    getLight() {
        for (var i = 0; i < 8; i++) {
            if (globalAttributes.keyNote.getOffset(intervalsInKey[i]).pitch ==
                this.pitch) {
                    return i;
                }
        }
        return -1;
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
    // In terms of notes per beat.
    arpComplexity: 2,
    // Number of chord tones usable by the arp.
    arpRange: 3,
    arpStaccato: 0.70,
    arpOctave: 4,

    // 3 -> triad, 4 -> seventh, etc.
    chordComplexity: 3,
    chordOctave: 3,
    chordLengthBeats: 4,
    chordHitsPerLength: 1,
    // How much of the chord duration is voiced.
    chordStaccato: 0.98,

    bassRhythmComplexity: 8,
    bassRhythmSyncopation: 3,
    bassStaccato: 0.7,
    bassOctave: 2,

    rhythmComplexity: 0.5
}

/** Correlate to soundfont files from /soundfont */
var sfInstruments = ['acoustic_bass', 'acoustic_grand_piano', 'cello',
    'orchestral_harp', 'violin', 'taiko_drum', 'tuba'];

var bassChannel = { name: "bass", channel: 0, instr: 'acoustic_bass', velocity: 100 };
var chordChannel = { name: "chord", channel: 1, instr: 'cello', velocity: 100 };
var arpChannel = { name: "arp", channel: 2, instr: 'orchestral_harp', velocity: 100 };
var harmChannel = { name: "harm", channel: 3, instr: 'taiko_drum', velocity: 0 };
var brassChannel = { name: "brass", channel: 4, instr: 'tuba', velocity: 0 };

var channels = [bassChannel, chordChannel, arpChannel, harmChannel, brassChannel];

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

            MIDI.setEffects([
                {
                    type: "Convolver",
                    highCut: 22050, // 20 to 22050
                    lowCut: 20, // 20 to 22050
                    dryLevel: 1, // 0 to 1+
                    wetLevel: 1, // 0 to 1+
                    level: 1, // 0 to 1+, adjusts total output of both wet and dry
                    impulse: "./inc/tuna/impulses/impulse_rev.wav", // the path to your impulse response
                    bypass: 0
                }
            ]);
            
        }
    })
}

// A bank of chord progressions that could be swapped in at any time.
// The major is a subjective value of how "major" the progression sounds to me.
var chordProgs = [{prog: ["I", "IV", "V", "IV"], major: 1.0},
                  {prog: ["vi", "vi", "IV", "V"], major: 1.0},
                  {prog: ["vi", "ii", "V", "I"], major: 0.2},
                  {prog: ["V", "IV", "I", "I"], major: 1.0},
                  {prog: ["vii", "V", "V", "vi"], major: 0.9},
                  {prog: ["vi", "I", "ii", "vi"], major: 0.2},
                  {prog: ["vi", "I", "IV", "V"], major: 0.5},];
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
 */
function voiceNote(channelName, noteName, duration) {
    var c = $.grep(channels, function(e){ return e.name == channelName })[0];
    var note = MIDI.keyToNote[noteName];
    var millisDur = beatsToMillis(duration);

    MIDI.noteOn(c.channel, note, c.velocity, 0);
    light(new Note(noteName).getLight());
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
        if (inChord[i])
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
 * @param {String} chord The chord, in string form.
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
    return intervalsToNotes(intervalsInChord(chord));
}

function intervalsInChord(chord) {
    // If you wanted to implement some non-diatonic chords here, you could.
    switch (chord) {
        case "I":
        case "IV":
        case "V":
            return [0, 4, 7, 11, 14, 17];
        case "ii":
        case "iii":
        case "vi":
            return [0, 3, 7, 10, 14, 17];
        case "vii":
            return [0, 3, 6, 10, 13, 17];
    }
}

/**
 * Returns invervals in the mode of a given chord.
 */
function keyIntervalsRelative(chord) {
    switch (chord) {
        case "I": return [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
        case "ii": return [2, 4, 5, 7, 9, 11, 12, 14, 16, 17];
        case "iii": return [4, 5, 7, 9, 11, 12, 14, 16, 17, 19];
        case "IV": return [5, 7, 9, 11, 12, 14, 16, 17, 19, 21];
        case "V": return [7, 9, 11, 12, 14, 16, 17, 19, 21, 23];
        case "vi": return [9, 11, 12, 14, 16, 17, 19, 21, 23, 24];
        case "vii": return [11, 12, 14, 16, 17, 19, 21, 23, 24, 26];
        default: return [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
    }
}

/**
 * The play function for the chord channel.
 */
function playChord() {
    var numHitsAtPosition = 0;

    // The duration (in decimal beats) that a single HIT of a chord is played.
    var chordHitDuration = variableAttributes.chordStaccato * 
            (variableAttributes.chordLengthBeats / variableAttributes.chordHitsPerLength);

    var progPosition = 0;

    var chordLoop = function() {        
        if (numHitsAtPosition == 0) {
            playArp(progPosition);
            playBass(progPosition);
            playGeneric("harm", 3, 0, progPosition);
            playGeneric("brass", 3, 1, progPosition);
        }

        voiceKeyChord("chord", currentChordProg.prog[progPosition], 
            variableAttributes.chordOctave, variableAttributes.chordComplexity,
            chordHitDuration);
        // Update a couple of counters.
        numHitsAtPosition++;
        if (numHitsAtPosition == variableAttributes.chordHitsPerLength) {
            numHitsAtPosition = 0;
            progPosition++;
        }
        if (progPosition == currentChordProg.prog.length) {
            progPosition = 0;
        }

        if (globalAttributes.playing)
            setTimeout(chordLoop, 
                beatsToMillis(variableAttributes.chordLengthBeats / variableAttributes.chordHitsPerLength));
    };
    chordLoop();
}

// A value of -1 will be a rest
var arpPatterns = [[0, 1, 2, 1, 0, 1, 2, 3],
                   [0, 2, 4, 5, 4, 5, 6, 8],
                   [2, 0, 2, 3, 5, 8, 7, 8],
                   [0, 2, 4, 5, 0, 2, 4, 5],
                   [4, 3, 5, 4, 3, 5, 7, -1]];
var currentArpPattern = arpPatterns[0];

/**
 * The play function for the arpeggiator channel. This gets called every
 * chord change by playChord().
 */
function playArp(progPosition) {
    var minArpInterval = beatsToMillis(1/8);

    var intervalCounter = 0;

    var patternPos = 0;
    
    var arpLoop = function() {
        var intervalsPerNote = Math.round(8 / variableAttributes.arpComplexity);

        // If we're at an interval that our attributes say should be played.
        if (intervalCounter % intervalsPerNote == 0) {
            if (patternPos == currentArpPattern.length)
                patternPos = 0;

            // Computes a duration unrelated to the interval counter.
            var duration = variableAttributes.arpStaccato * (1 / variableAttributes.arpComplexity);
            var currentChord = currentChordProg.prog[progPosition];
            // Array of notes in the current played chord.
            var chordNotes = notesInChord(currentChord, variableAttributes.arpOctave);
            var modalIntervals = keyIntervalsRelative(currentChord);

            var noteVoice = globalAttributes.keyNote;
            noteVoice.setOctave(variableAttributes.arpOctave);
            noteVoice = noteVoice.getOffset(modalIntervals[currentArpPattern[patternPos]]);

            voiceNote("arp", noteVoice.getName(), duration);
            
            patternPos++;
        }
        intervalCounter++;

        // Run the arp for a measure, then stop, ensuring each measure is synced.
        // Four measures, four beats per measure, eight intervals per beat.
        if (globalAttributes.playing && intervalCounter != (4 * 8) - 1)
            setTimeout(arpLoop, minArpInterval);
    };
    arpLoop();
}

var bassSequences = [[[0, 0.5], [-1, 0.5], [0, 3]],
                     [[0, 0.75], [2, 0.25], [4, 0.5], [-1, 0.5], [0, 2]],
                     [[2, 1], [0, 1], [-1, 0.5], [4, 1.5]],
                     [[0, 0.5], [2, 0.5], [-1, 0.75], [4, .25], [0, 1], [2, 1]],
                     [[5, 0.5], [0, 0.5] [-1, 0.75], [0, 0.25], [2, 0.5], [5, 1.5]]];
var currentBassSequence = bassSequences[1];

function playBass(progPosition) {
    // Keeps track of the amount of notes played. This will terminate when
    // bassRhythmComplexity is reached.
    var notesCounter = 0;
    var seqCounter = 0;
    var bassLoop = function() {
        var noteDuration = currentBassSequence[seqCounter][1];

        var currentChord = currentChordProg.prog[progPosition];
        var modalIntervals = keyIntervalsRelative(currentChord);
        var interval = currentBassSequence[seqCounter][0];
        var noteToPlay = globalAttributes.keyNote.getOffset(modalIntervals[interval]);
        noteToPlay.setOctave(variableAttributes.bassOctave);

        voiceNote("bass", noteToPlay.getName(), variableAttributes.bassStaccato * noteDuration);

        if (globalAttributes.playing && seqCounter < currentBassSequence.length - 1) {
            setTimeout(bassLoop, beatsToMillis(noteDuration));
        }
        notesCounter++;
        seqCounter++;
    };
    bassLoop();
}

var genericSequences = [[[0, 0.75], [5, .25], [0, 0.5], [5, 0.5], [0, 0.75], [5, .25], [0, 0.5], [5, 0.5]],
                        [[-1, 1.75], [4, .25], [4, .5], [4, .5], [4, 1]]];

function playGeneric(channel, octave, gSeqIndex, progPosition) {
    var currentGenSequence = genericSequences[gSeqIndex];
    var seqCounter = 0;
    var loop = function() {
        var noteDuration = currentGenSequence[seqCounter][1];
        var currentChord = currentChordProg.prog[progPosition];
        var modalIntervals = keyIntervalsRelative(currentChord);
        var interval = currentGenSequence[seqCounter][0];
        var noteToPlay = globalAttributes.keyNote.getOffset(modalIntervals[interval]);
        noteToPlay.setOctave(octave);

        voiceNote(channel, noteToPlay.getName(), variableAttributes.arpStaccato * noteDuration);
        
        if (globalAttributes.playing && seqCounter < currentGenSequence.length - 1) {
            setTimeout(loop, beatsToMillis(noteDuration));
        }
        seqCounter++;
    }
    loop();
}