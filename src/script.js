import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import * as MathUtils from 'three/src/math/MathUtils.js'
import Stats from 'three/examples/jsm/libs/stats.module'

/**
 * Base
 */
// Debug
const stats = Stats()
document.body.appendChild(stats.dom)

const gui = new GUI({width : 800})

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
// 1, 4, 
const particleTexture = textureLoader.load('/textures/particles/4.png')


/**
 * MATERIALS
 */
// const particlesGeometry = new THREE.SphereGeometry(1,32,32)
const fibSphereGeometry = new THREE.BufferGeometry()

let points = 100000

let innerRadius = 5
const goldenRatio = (1 + Math.sqrt(5)) / 20;
const goldenAngleRadians = Math.PI * 2 * goldenRatio;
// WHAT PARTS OF SPHERE EQUATION CAN I REMOVE FROM GAME LOOP?

// INTERESTING NUMBERS : WHAT RANGE TO SET? WHAT INCRIMENTS?
// 3.005 : two spheres shrinking and growing from each pole
// 1.2 : 5 pointed star-sphere
// 1.047 : large, bulbous waves moving from pole to pole
// 1.2566 : multipe spheres shrinking and growing along z axis
// 3.45 : 4 pointed deep spiral
// 3.311 : large, bulbous waves moving from pole to pole
// ### 6.2832 : equivalent to 0???
let amplitude = 1 // number of peaks and valleys in wave
let speedOfWaves = .2
let rotationSpeed = .1
let waveLength = 1


// GUI PARAMS
const guiParams = {
	innerRadius : 5,
    amplitude: 1,
    speedOfWaves: .2,
    rotationSpeed: .1,
    waveLength : 1,
    scopeOn : false
}

gui.add( guiParams, 'innerRadius', .1, 10, .1 ).onChange(value =>{
    innerRadius = value
}); 	
gui.add( guiParams, 'amplitude', -50, 50, .1
 ).onChange(value =>{
    amplitude = value
}); 
gui.add( guiParams, 'speedOfWaves', 0, 10, .1 ).onChange(value =>{
    speedOfWaves = value
});

// this param isnt my fav
gui.add( guiParams, 'rotationSpeed', 0, 1, .01 ).onChange(value =>{
    rotationSpeed = value
});
gui.add( guiParams, 'waveLength', 0,(Math.PI), .00005 ).onChange(value =>{
    waveLength = value
});

gui.add( guiParams, 'scopeOn' );


// for each point, we need 3 positions, so positions is 3x points. 
const positions = new Float32Array(points * 3) // each point requires xyz cordinates
const colors = new Float32Array(points * 3) // each point requires rbg values

fibSphereGeometry.setAttribute(
    'position',
    // specify that there are 3 values for each position
    new THREE.BufferAttribute(positions, 3)
)

fibSphereGeometry .setAttribute(
    'color',
    new THREE.BufferAttribute(colors, 3)
)

const particlesMaterial = new THREE.PointsMaterial({
    size : 0.15,
    sizeAttenuation: true
})

particlesMaterial.transparent = true
particlesMaterial.alphaMap = particleTexture
particlesMaterial.depthWrite = false
particlesMaterial.vertexColors = true
particlesMaterial.blendAlpha = false

// Points
// same as mesh, geometry and material
const sphereParticles= new THREE.Points(fibSphereGeometry , particlesMaterial)
sphereParticles.name = 'sphereParticles'

scene.add(sphereParticles)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.z = 3
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))


// AUDIO

const audioContext = new AudioContext();

function lfoValue(min, max, speed, time){
    const lfoRange = max - min
    const lfoValue = (((Math.sin(time * speed) + 1) * lfoRange) / 2) + min
    return lfoValue
}

function createFilterNode(type,Q){
    const filterNode = audioContext.createBiquadFilter();
    filterNode.type = type
    filterNode.Q.value = Q

    return filterNode
}

// LEAD

const bpFilterNodeLead = createFilterNode('bandpass', '5')
const leadGain = audioContext.createGain();
// this is a quick fix and should later be tied to the slider value
leadGain.gain.value = .4
const tremGain = new GainNode(audioContext)
const leadPan = audioContext.createStereoPanner()
let leadOscDetune = 0


leadPan.pan.value = -.3

function playLeadOsc(time, wave, attackTime, releaseTime, noteSequence, currentNoteIndex) {
    const notesLength = noteSequence.length
    const sweepLength = attackTime + releaseTime

    const leadFundamentalOsc = new OscillatorNode(audioContext, {
        frequency: noteSequence[currentNoteIndex],
        type: wave,
        detune : leadOscDetune,
        
    });
    const leadFundamentalOscGain = audioContext.createGain();
    console.log(leadFundamentalOsc.detune.value)
    // CHAIN
    leadFundamentalOsc.connect(leadFundamentalOscGain).connect(bpFilterNodeLead).connect(convolutionDistortion1).connect(tremGain).connect(plateReverb1).connect(leadPan).connect(leadGain).connect(audioContext.destination);

    // START STOP
    leadFundamentalOsc.start(time);
    leadFundamentalOsc.stop((time) + sweepLength);

    // ALTERNATE PANNING
    if (leadPan.pan.value < 0){
        leadPan.pan.value = .3
    } else {
        leadPan.pan.value = -.3
    }
    // console.log(leadObj.noteIndex)
    // Advance notes
    if (currentNoteIndex< notesLength - 1){
        leadObj.instrument.noteIndex = leadObj.instrument.noteIndex + 1
    } else {
        leadObj.instrument.noteIndex = 0
    }
}

// ADDITIVE PAD

// PAD FILTER
const bpFilterNodePad = createFilterNode('bandpass', '25')

// fundamental detune global vars
let padGain = audioContext.createGain();
let padOvertoneOneDetune = 0
let padOvertoneFourDetune = 0
let padOvertoneFiveDetune = 0
let padOvertoneSixDetune = 0
let padOvertoneSevenDetune = 0
let padOvertoneEightDetune = 0

// current chord index not used?
function playAdditivePad(time, oscType, fundamental, chordSequence, currentChordIndex){

    const  chordSequenceLength= chordSequence.length
    // console.log(chordSequence[currentChordIndex])
    // which ones should have detune? keep detune within function?
    let fundamentalOsc = new OscillatorNode(audioContext, {
        frequency: fundamental,
        type: oscType,
    });
    let masterGain = audioContext.createGain();

    
    let overtoneOneOsc = new OscillatorNode(audioContext, {
        frequency: fundamental * 2,
        type: oscType,
        detune : padOvertoneOneDetune
    });
    let overtoneOneGain = audioContext.createGain();

    let overtoneTwoOsc= new OscillatorNode(audioContext, {
        frequency: fundamental * 3,
        type: oscType,
    });
    let overtoneTwoGain = audioContext.createGain();

    let overtoneThreeOsc= new OscillatorNode(audioContext, {
        frequency: fundamental * 4,
        type: oscType,
        detune : padOvertoneFourDetune
        
    });
    let overtoneThreeGain = audioContext.createGain();

    let overtoneFourOsc= new OscillatorNode(audioContext, {
        frequency: fundamental * 5,
        type: oscType,
    });
    let overtoneFourGain = audioContext.createGain();

    let overtoneFiveOsc= new OscillatorNode(audioContext, {
        frequency: fundamental * 6,
        type: oscType,
        detune : padOvertoneFiveDetune 
    });
    let overtoneFiveGain = audioContext.createGain();

    let overtoneSixOsc= new OscillatorNode(audioContext, {
        frequency: fundamental * 7,
        type: oscType,
        detune: padOvertoneSixDetune
    });
    let overtoneSixGain = audioContext.createGain();

    let overtoneSevenOsc= new OscillatorNode(audioContext, {
        frequency: fundamental * 8,
        type: oscType,
        detune: padOvertoneSevenDetune
    });
    let overtoneSevenGain = audioContext.createGain();

    let overtoneEightOsc= new OscillatorNode(audioContext, {
        frequency: fundamental * 9,
        type: oscType,
        detune : padOvertoneEightDetune
    });
    let overtoneEightGain = audioContext.createGain();

    masterGain.gain.cancelScheduledValues(time + .01);
    masterGain.gain.setValueAtTime(0, time+ .01);
    masterGain.gain.linearRampToValueAtTime(4, (time + 1) );
    masterGain.gain.linearRampToValueAtTime(0, (time + 9));

    overtoneOneGain.gain.cancelScheduledValues(time + .01);
    overtoneOneGain.gain.setValueAtTime(0, time+ .01);
    overtoneOneGain.gain.linearRampToValueAtTime(.3, (time + 1));
    overtoneOneGain.gain.linearRampToValueAtTime(0, (time) + 3);

    overtoneTwoGain.gain.cancelScheduledValues(time + .01);
    overtoneTwoGain.gain.setValueAtTime(0, time+ .01);
    overtoneTwoGain.gain.linearRampToValueAtTime(.5, (time + .5));
    overtoneTwoGain.gain.linearRampToValueAtTime(0, (time) +(4));

    overtoneThreeGain.gain.cancelScheduledValues(time + .01);
    overtoneThreeGain.gain.setValueAtTime(0, time+ .01);
    overtoneThreeGain.gain.linearRampToValueAtTime(.6, (time + 2));
    overtoneThreeGain.gain.linearRampToValueAtTime(0, (time) +(5));

    overtoneFourGain.gain.cancelScheduledValues(time + .01);
    overtoneFourGain.gain.setValueAtTime(0, time+ .01);
    overtoneFourGain.gain.linearRampToValueAtTime(.2, (time + 1));
    overtoneFourGain.gain.linearRampToValueAtTime(0, (time) +(9));

    overtoneFiveGain.gain.cancelScheduledValues(time + .01);
    overtoneFiveGain.gain.setValueAtTime(0, time+ .01);
    overtoneFiveGain.gain.linearRampToValueAtTime(.4, (time + 3));
    overtoneFiveGain.gain.linearRampToValueAtTime(0, (time) +(9));

    overtoneSixGain.gain.cancelScheduledValues(time + .01);
    overtoneSixGain.gain.setValueAtTime(0, time+ .01);
    overtoneSixGain.gain.linearRampToValueAtTime(.2, (time + 2));
    overtoneSixGain.gain.linearRampToValueAtTime(0, (time) +(8));

    overtoneSevenGain.gain.cancelScheduledValues(time + .01);
    overtoneSevenGain.gain.setValueAtTime(0, time+ .01);
    overtoneSevenGain.gain.linearRampToValueAtTime(.2, (time + 5));
    overtoneSevenGain.gain.linearRampToValueAtTime(0, (time) +(9));

    overtoneEightGain.gain.cancelScheduledValues(time + .01);
    overtoneEightGain.gain.setValueAtTime(0, time+ .01);
    overtoneEightGain.gain.linearRampToValueAtTime(.2, (time + 2));
    overtoneEightGain.gain.linearRampToValueAtTime(0, (time) +(9));

    // routing 

    fundamentalOsc.connect(masterGain)
    overtoneOneOsc.connect(overtoneOneGain)
    overtoneTwoOsc.connect(overtoneTwoGain)
    overtoneThreeOsc.connect(overtoneThreeGain)
    overtoneFourOsc.connect(overtoneFourGain)
    overtoneFiveOsc.connect(overtoneFiveGain)
    overtoneSixOsc.connect(overtoneSixGain)
    overtoneSevenOsc.connect(overtoneSevenGain)
    overtoneEightOsc.connect(overtoneEightGain)

    overtoneOneGain.connect(masterGain)
    overtoneTwoGain.connect(masterGain)
    overtoneThreeGain.connect(masterGain)
    overtoneFourGain.connect(masterGain)
    overtoneFiveGain.connect(masterGain)
    overtoneSixGain.connect(masterGain)
    overtoneSevenGain.connect(masterGain)
    overtoneEightGain.connect(masterGain)

    // detune lfos (happening once or recouring?)
    
    
    // CHAIN
    masterGain.connect(bpFilterNodePad).connect(convolutionDistortion2).connect(judsonReverb2).connect(plateReverb2).connect(padGain).connect(audioContext.destination)

    // START STOP
    fundamentalOsc.start(time + .01)
    overtoneOneOsc.start(time + .01)
    overtoneTwoOsc.start(time + .01)
    overtoneThreeOsc.start(time + .01)
    overtoneFourOsc.start(time + .01)
    overtoneFiveOsc.start(time + .01)
    overtoneSixOsc.start(time + .01)
    overtoneSevenOsc.start(time + .01)
    overtoneEightOsc.start(time + .01)


    fundamentalOsc.stop(time + 9)
    overtoneOneOsc.stop(time + 9)
    overtoneTwoOsc.stop(time + 9)
    overtoneThreeOsc.stop(time + 9)
    overtoneFourOsc.stop(time + 9)
    overtoneFiveOsc.stop(time + 9)
    overtoneSixOsc.stop(time + 9)
    overtoneSevenOsc.stop(time + 9)
    overtoneEightOsc.stop(time + 9)

};


// REVERBS

async function createJudsonReverb() {
  let convolver = audioContext.createConvolver();

  // load impulse response from file
  let response = await fetch("./judsonMemorialChurch.wav");
  let arraybuffer = await response.arrayBuffer();
  convolver.buffer = await audioContext.decodeAudioData(arraybuffer);

  return convolver;
}
let judsonReverb2 = await createJudsonReverb();

async function createPlateReverb() {
  let convolver = audioContext.createConvolver();

  // load impulse response from file
  let response = await fetch("./plate IR.wav");
  let arraybuffer = await response.arrayBuffer();
  convolver.buffer = await audioContext.decodeAudioData(arraybuffer);

  return convolver;
}
let plateReverb1 = await createPlateReverb();
let plateReverb2 = await createPlateReverb();
let plateReverb3 = await createPlateReverb();

async function createConvolutionDistortion() {
  let convolver = audioContext.createConvolver();

  // load impulse response from file
  let response = await fetch("./Marshall1960A-G12Ms-SM57-Cone-12in.wav");
  let arraybuffer = await response.arrayBuffer();
  convolver.buffer = await audioContext.decodeAudioData(arraybuffer);

  return convolver;
}
let convolutionDistortion1 = await createConvolutionDistortion();
let convolutionDistortion2 = await createConvolutionDistortion();

const bassLfoFilterNode = createFilterNode('lowpass', '5')

const bassGain = audioContext.createGain();

const bassPan = audioContext.createStereoPanner()
//playBass(time, 'sine', instrument.noteSequence[instrument.noteIndex], .5, 1)
function playBass(time, wave, attack, release, noteSequence, currentNoteIndex){
    // console.log('pb',noteSequence, currentNoteIndex)
    const notesLength = noteSequence.length
    let frequency = noteSequence[currentNoteIndex]
    // fundamental osc goes straight to sweepEnvGain envelope
    // sub osc and 5th osc are attenuated before linking to sweepEnvGain

    const bassOscFundamental = audioContext.createOscillator()
    bassOscFundamental.type = wave
    bassOscFundamental.frequency.value = frequency
    

    const bassOscSub = audioContext.createOscillator()
    bassOscSub.type = wave
    bassOscSub.frequency.value = frequency / 2
    const bassOscSubGain = audioContext.createGain()
    bassOscSubGain.gain.value = 0.06

    const bassOsc3rd = audioContext.createOscillator()
    bassOsc3rd.type = wave
    bassOsc3rd.frequency.value = frequency * 3
    const bassOsc3rdGain = audioContext.createGain()
    bassOsc3rdGain.gain.value = 0.06

    const bassOsc5th = audioContext.createOscillator()
    bassOsc5th.type = wave
    bassOsc5th.frequency.value = frequency * 5
    const bassOsc5thGain = audioContext.createGain()
    bassOsc5thGain.gain.value = 0.07

    // ADSR but only atk rls
    const sweepEnvGain = new GainNode(audioContext);
    sweepEnvGain.gain.cancelScheduledValues(time);
    sweepEnvGain.gain.setValueAtTime(0, time);
    sweepEnvGain.gain.linearRampToValueAtTime(1, (time) + attack - .5);
    sweepEnvGain.gain.linearRampToValueAtTime(0, (time) +(attack + release));

    const bassBandpassFilter = new BiquadFilterNode(audioContext, {
        type: 'bandpass',
        frequency: 300,  // centre frequency in Hz
        Q: 2,             // controls bandwidth (higher Q = narrower band)
    });

    bassBandpassFilter.frequency.cancelScheduledValues(time);
    bassBandpassFilter.frequency.setValueAtTime(20, time);
    bassBandpassFilter.frequency.linearRampToValueAtTime(200, time + attack);
    bassBandpassFilter.frequency.linearRampToValueAtTime(20, time + attack + release);

    // create sub osc and fifth above fundamental and link to chain at lower volumes

    bassOsc5th.connect(bassOsc5thGain)
    bassOscSub.connect(bassOscSubGain)
    bassOsc3rd.connect(bassOsc3rdGain)

    bassOsc5thGain.connect(sweepEnvGain)
    bassOscSubGain.connect(sweepEnvGain)
    bassOsc3rdGain.connect(sweepEnvGain)

    bassOscFundamental.connect(sweepEnvGain)

    // removed bass lfo filter. seemed redundant
    sweepEnvGain.connect(bassBandpassFilter).connect(bassPan).connect(plateReverb3).connect(bassGain).connect(audioContext.destination)
    bassOscFundamental.start(time)
    bassOscFundamental.stop(time + (attack + release))

    // spice things up with a lil variation in stop, start attack and release?
    bassOsc3rd.start(time + .1)
    bassOsc3rd.stop((time + .1) + (attack + (release+.3)))

    bassOsc5th.start(time + .2)
    bassOsc5th.stop((time + .2) + ((attack + .2) + (release + .3)))

    bassOscSub.start(time + .2)
    bassOscSub.stop(time + (attack + (release + .3)))

    // Advance notes
    if (currentNoteIndex < notesLength - 1){
        bassObj.instrument.noteIndex = bassObj.instrument.noteIndex + 1
    } else {
        bassObj.instrument.noteIndex = 0
    }
}

// change drone to bass in variables
const bassGainControl = document.querySelector("#bass-volume");

bassGainControl.addEventListener("input", () => {
  bassGain.gain.value = bassGainControl.value;
  console.log(bassGain.gain.value)
});

const leadGainControl = document.querySelector("#lead-volume");
// console.log(leadGain.gain)
leadGainControl.addEventListener("input", () => {
    // why does lead gain default to 1???
    leadGain.gain.value = leadGainControl.value;
});

const padGainControl = document.querySelector("#pad-volume");

padGainControl.addEventListener("input", () => {
  padGain.gain.value = padGainControl.value;
});

// SEQUENCER

// how do I make lead Note Sequence sound good at many lengths?
// would pulse array (rhtyhm) be better included in instrumentObj than metronomeObj? 

let leadObj = {
    'instrument' : {
        type : 'lead',
        noteSequence: [783.99, 622.25, 932.35, 587.33, 1174.66, 783.99, 622.25, 932.35, 587.33],
        noteIndex: 0,
        pulseBooleanArray : [true, false, false, true, false, false, true, false],
        lastPlayedBeat: null
    },
    'metronome' : {
        lastPulseTime: 0,
        startTime: 0,
        currentPulse: 1,
        totalLoopTime: null,
        timeWithinLoopSeconds: null
    }
}
    
let chordObj = {
    "EbM7" : [311.13, 392, 587.33,  466.16], // check to see what chord it really is
    "EbM7inv" : [466.16, 587.33, 392.00, 311.13],
    "CM7" : [261.63, 311.13, 392.00, 466.16], // C, Eb, G, Bb — Cm7
    "CM7inv" : [466.16, 392.00, 311.13, 261.63],
    "Bb7" : [233.08, 293.66, 349.23, 466.16] // Bb, D, F, A — BbMaj7
}

let padObj = {
    'instrument' : {
        type : 'pad',
        chordSequence: ["EbM7", "CM7", "EbM7inv", "CM7inv", "Bb7"],
        noteIndex: 0,
        // adjust length of pad to fit into seq?
        pulseBooleanArray : [true, false, false, true, false, false, false, true],
        lastPlayedBeat: null
    },
    'metronome' : {
        lastPulseTime: 0,
        startTime: 0,
        currentPulse: 1,
        totalLoopTime: null,
        timeWithinLoopSeconds: null
    }
}

let bassObj = {
    'instrument' : {
        type : 'bass',
        // keep above 100 and lower than 200 to not step on pad
        noteSequence: [155.562, 116.54, 130.81, 116.54],
        noteIndex: 0,
        pulseBooleanArray : [true, false, false, true, false],
        lastPlayedBeat: null
    },
    'metronome' : {
        lastPulseTime: 0,
        startTime: 0,
        currentPulse: 1,
        totalLoopTime: null,
        timeWithinLoopSeconds: null
    }
}


// make this work for all instruments by taking diff args
function sequencer(time, metronomeBeat, instrumentObj){
   
    let instrumentType = instrumentObj.instrument.type
    let noteSequence = instrumentObj.instrument.noteSequence
    let noteIndex = instrumentObj.instrument.noteIndex
    let pulseArrayLength = instrumentObj.instrument.pulseBooleanArray.length
    // multiple playOsc() funcs can be pushed to array
    // pad plays a chord so n slightly staggered oscs are played at once to form chord
    let playOscArray = []
    if (instrumentType == 'lead'){
        let playOsc = () => playLeadOsc(time, 'triangle', 0.1, 1, noteSequence, instrumentObj.instrument.noteIndex);
        playOscArray.push(playOsc)
    } else if (instrumentType == 'pad'){
        let chordSequence = instrumentObj.instrument.chordSequence
        let currentChord = instrumentObj.instrument.chordSequence[instrumentObj.instrument.noteIndex]
        let currentChordNotes = chordObj[currentChord]
        let timeStagger = 0
        for (let i = 0; i < currentChordNotes.length; i++){
            let chordNote = currentChordNotes[i]
            let playOsc = () => playAdditivePad(time + timeStagger, "sine", chordNote, chordSequence, noteIndex)
            playOscArray.push(playOsc)
            timeStagger += .5
        }
        
    } else if (instrumentType === 'bass'){
        // make attack release global vars later
        // playBass(time, wave, attack, release, noteSequence, currentNoteIndex)
        let playOsc = () => playBass(time, 'sine', 1.2, 2, noteSequence, noteIndex)
        playOscArray.push(playOsc)
    }
    // down beat for music is 1
    // but boolean pulse array starts at 0
    let currentBeat = metronomeBeat - 1
    
    for (let i = 0; i < pulseArrayLength; i++){
        let currentSequenceOnsetBoolean = instrumentObj.instrument.pulseBooleanArray[i]
        let currentSequenceOnset = i
        // bug occurs when sequence only has length of 1 because lastPlayed beat is same as currentBeat
        // IF step in seq matches current beat and is true, play note
        // note seq and pulse seq could be combined into one, but how would notes be stored if turned off?
        if (currentSequenceOnsetBoolean == true && currentSequenceOnset === currentBeat && instrumentObj.instrument.lastPlayedBeat !== currentBeat){
            // play all oscilators pushed to array. lead and bass only have one, pad has 4 (currentley)
            for (const ocsPlayFunc of playOscArray){
                ocsPlayFunc()
            }
            if (instrumentObj.instrument.type == 'pad'){
                // pad needs special logic to advance chord since multiple oscs are played at once
                if (instrumentObj.instrument.noteIndex < instrumentObj.instrument.chordSequence.length - 1){
                    padObj.instrument.noteIndex = padObj.instrument.noteIndex + 1
                } else {
                    padObj.instrument.noteIndex = 0
                }
                padStartTimeArray.push(time)
            } else if (instrumentObj.instrument.type == 'lead'){
                leadStartTimeArray.push(time)
            } else if (instrumentObj.instrument.type == 'bass'){
                bassStartTimeArray.push(time)
            }
            instrumentObj.instrument.lastPlayedBeat = currentBeat
        } 
    } 
 
}

// METRONOME

let bpm = 20;

// Metronome Objects for each instrument, share global bpm
let leadMetronomeObj = {
    lastPulseTime: 0,
    startTime: 0,
    currentPulse: 1,
    totalLoopTime: null,
    timeWithinLoopSeconds: null
}

let padMetronomeObj = {
    lastPulseTime: 0,
    startTime: 0,
    currentPulse: 1,
    totalLoopTime: null,
    timeWithinLoopSeconds: null
}

let bassMetronomeObj = {
    lastPulseTime: 0,
    startTime: 0,
    currentPulse: 1,
    totalLoopTime: null,
    timeWithinLoopSeconds: null
}
// METRONOME SHOULD RETURN BOTH BEATS AND TIME COMPLETED OF LOOP

function metronome(currentTime, instrumentObj, bpm){
    // console.log(instrumentObj)
    let beatLengthSeconds = 60.0 / bpm;
    instrumentObj.metronome.totalLoopTime = beatLengthSeconds * instrumentObj.instrument.pulseBooleanArray.length

    // GEMINI's Metronome (modulo method to wrap with floor division to count)

    let deltaSinceStart = currentTime - instrumentObj.metronome.startTime
    // mod operator restarts timeWithinLoopSeconds at 0 whenever deltaSinceStart(or a multiple of deltaSinceStart that is divisible by TotalLoopTime) excedes totalLoopTime 
    // this counts up to total loop time, then resets to zero when it goes over, repeating indefinetily 
    instrumentObj.metronome.timeWithinLoopSeconds = (deltaSinceStart) % instrumentObj.metronome.totalLoopTime
    
    // timeWithinLoopSeconds is counting up to totalLoopTime then wraps back to 0 after
    // lets say timeWithinLoopSeconds is 1.5, and beatLenghSeconds is 3. This would equal .5, rounded down 0. 
    // any time value less than one beat lenght will be rounded to zero, and any over a beat length will be rounded to the lower beat 
    // add one to go from zero index to music convention of starting at 1
    let newPulse = Math.floor(instrumentObj.metronome.timeWithinLoopSeconds / beatLengthSeconds) + 1

    // only rewrite currentPulse global var if the newPulse is not the same as currentPulse
    // this appears to keep metronome in sync with pulse changes
    if (newPulse !== instrumentObj.metronome.currentPulse) {
        instrumentObj.metronome.currentPulse = newPulse;
        instrumentObj.metronome.lastPulseTime = currentTime;
    }
    return instrumentObj.metronome.currentPulse
};

// UTILITY FUNCTIONS

// inMin and inMax should be the delta for the animation
// outMin and outMax the animation value
function mapV(value, inMin, inMax, outMin, outMax){
    return outMin + (outMax - outMin)*((value - inMin)/(inMax - inMin))
}

function easeInOutSine(value) {
    // return -(Math.cos(Math.PI * value) - 1) / 2;
    return -0.5 * (Math.cos(value * Math.PI) - 1)
}

// ANIMATION GLOBAL VARS

let padStartTimeArray = []
const padAnimationLength = 9

let leadStartTimeArray = []
const leadAnimationLength = 3 

// radius increase? maybe pad only does wavelength increse and not amplitude? 
let bassStartTimeArray = []
const bassAnimationLength = 3

function removeStartTimesOfCompletedAnimations(elapsedTime, startTimeArray, animationLength){
    for (let i = 0; i < startTimeArray.length; i++){
        let startTime = startTimeArray[i]
        let delta = elapsedTime - startTime
        if (delta > animationLength){
            startTimeArray.splice(i, i+1)
        }
    }
}

// what if this slowed down throughout the animation? start fast but end slower
function returnPercentCompleteAnimation(elapsedTime, startTime, animationLength){
    let animationPercentageComplete = 0
    let timeLeftInAnimation = elapsedTime - startTime
    let isAnimationActive = timeLeftInAnimation < animationLength
    if (isAnimationActive){
        animationPercentageComplete = mapV(timeLeftInAnimation, 0, animationLength, 0, 100)
    } else {
        animationPercentageComplete = 100
    }
    return animationPercentageComplete
}


function raiseAndLowerAnimationValueTo100(percentCompleteAnimation){
    let value = 0
    if (percentCompleteAnimation <= 50){
        value = percentCompleteAnimation
    } else {
        value = 100 - percentCompleteAnimation
    }
    let normalizedValue = mapV(value, 0, 50, 0, 100)
    return normalizedValue
}

function sumAllAnimationValues(elapsedTime, startTimeArray, animationLength){
    let res = 0
    if (startTimeArray.length === 0){
        return 0
    } else {
        for (let i = 0; i < startTimeArray.length; i++ ){
            let currentStartTime = startTimeArray[i]
            let percentageComplete = returnPercentCompleteAnimation(elapsedTime, currentStartTime, animationLength)
            let individualAnimationValue = raiseAndLowerAnimationValueTo100(percentageComplete)
            res += individualAnimationValue
        }
        return res
    }
}

// LEAD ANIMATION FUNCTIONS

function createLeadAnimationPercentCompleteArray(elapsedTime, leadStartTimeArray, leadAnimationLength, lowerBound, upperBound){
    let percentCompleteArray = []
    if (leadStartTimeArray.length == 0){
        return []
    } else {
        for (let i = 0; i < leadStartTimeArray.length; i ++){
            let currentStartTime = leadStartTimeArray[i]
            let percentageComplete = returnPercentCompleteAnimation(elapsedTime, currentStartTime, leadAnimationLength)
            percentCompleteArray.push(percentageComplete)
        }
    }
    return percentCompleteArray
}

// could I use mod operator in any of these functions?
// this function lives in the main render loop
// use % to return position between upper and lower bound
function createPositionBetweenBoundsArray(leadAnimationPercentCompleteArray, lowerBound, upperBound){
    // buffer zone allows full gradient of band to pass out of sphere, 
    let bufferZone = upperBound - lowerBound
    // let lowerStartBuffer = -.5
    let positionBetweenBoundsArray = []
    if (leadAnimationPercentCompleteArray.length == 0){
        return []
    } else {
        for (let i = 0; i < leadAnimationPercentCompleteArray.length; i ++){
            let currentPercentageComplete = leadAnimationPercentCompleteArray[i]
            // modify buffer zone of lower edge so that animation appears when note is triggered
            let position = mapV(currentPercentageComplete, 0, 100, lowerBound - .5, upperBound + bufferZone)
            positionBetweenBoundsArray.push(position)
        }
    }
    return positionBetweenBoundsArray
}


// this function lives in the sphere particles/color loop
function changeColorOfParticlesWithinBandwidth(positionBetweenBoundsArray, outerRadius, i3, bandwidth){
    // OUTER RADIUS is the distance of the particle from the center (Maybe rename var?)
    if (positionBetweenBoundsArray.length > 0){
        for (let j = 0; j < positionBetweenBoundsArray.length; j++){
            let currentBandPosition = positionBetweenBoundsArray[j]
            let upperEdge = currentBandPosition + (bandwidth / 2)
            let lowerEdge = currentBandPosition - (bandwidth / 2)
            // how do i create a gradient using sin()?
            // outer radius is the actual radius of the paricle
            if ((outerRadius)  >= lowerEdge  && (outerRadius) <= upperEdge){
                // 1.0 is full white
                // colors[i3] is previous color
                // lowerEdge and upperEdge should equal previous color
                // center, currentPosition should equal 1.0
                let originalRed = colors[i3]
                let originalGreen = colors[i3+1]
                let originalBlue = colors[i3+2]

                let redInverse = 1.0 - originalRed
                let greenInverse = 1.0 - originalGreen
                let blueInverse = 1.0 - originalBlue

                // need to make lower edge 0 and upper edge PI
                // What if i desaturated instea of white???
                let gradient = mapV(outerRadius, lowerEdge, upperEdge, 0 , Math.PI)
                
                colors[i3] = originalRed + (redInverse * Math.sin(gradient)) // r
                colors[i3+ 1] = originalGreen + (greenInverse * Math.sin(gradient))// g
                colors[i3+2] = originalBlue + (blueInverse * Math.sin(gradient)) // b
                
            }
        }
    }
}

function changePositionParticlesWithinBandwidth(positionBetweenBoundsArray, polarAngle, azimuth, outerRadius, i3, bandwidth){
    // OUTER RADIUS is the distance of the particle from the center (Maybe rename var?)
    const radiusAdditionAmmount = .165
    if (positionBetweenBoundsArray.length > 0){
        for (let j = 0; j < positionBetweenBoundsArray.length; j++){
            let currentBandPosition = positionBetweenBoundsArray[j]
            let upperEdge = currentBandPosition + (bandwidth / 2)
            let lowerEdge = currentBandPosition - (bandwidth / 2)

            if ((outerRadius)  >= lowerEdge  && (outerRadius) <= upperEdge){
                
                // sine gradient
                // lowerEdge should equal 0, middle should equal 1, upper edge should equal 0
                let radiusGradient = mapV(outerRadius, lowerEdge, upperEdge, 0 , Math.PI)
                let radiusModified = mapV(Math.sin(radiusGradient), 0, 1, 0 , radiusAdditionAmmount)
                let radiusModifiedEase = -(Math.cos(Math.PI * radiusModified) - 1) / 2

                // spherical to cartesian with extra radius
                positions[i3] = Math.sin(polarAngle) * Math.cos(azimuth) * (outerRadius + radiusModifiedEase);     // x
                positions[i3 + 1] = Math.sin(polarAngle) * Math.sin(azimuth) * (outerRadius + radiusModifiedEase); // y
                positions[i3 + 2] = Math.cos(polarAngle) * (outerRadius + radiusModifiedEase) ; // z

            }
        }
    }
}

let globalElapsedTime = null
let globalMetronomeTime = null
/**
 * Animate
 */

const clock = new THREE.Clock()


const tick = () =>
{   
    const elapsedTime = clock.getElapsedTime();
    // console.log(padOvertoneOneOscDetune)
    globalElapsedTime = elapsedTime

    stats.update()

    // will later need a differnet metronome for each instrument
    let leadMetronomeTime = metronome(elapsedTime,  leadObj, bpm);
    let padMetronomeTime = metronome(elapsedTime, padObj, bpm);
    let bassMetronomeTime = metronome(elapsedTime, bassObj, bpm)
    // globalMetronomeTime = metronomeTime
   
    let leadSequencer = sequencer(elapsedTime, leadMetronomeTime, leadObj)
    // sinwave controlled tremelo on lead gain node
    tremGain.gain.value = lfoValue(.5, 1.5, 40, elapsedTime)
    // lead fast shallow pitch modulation
    leadOscDetune = lfoValue(0, 6, 10000, elapsedTime) - 3
    // console.log(leadOsc)
 
    // padSequencer(elapsedTime, metronomeTime, padSequence)
    let padSequencer = sequencer(elapsedTime, padMetronomeTime, padObj)
    // individual fundamental osc detunes 
    padOvertoneOneDetune = lfoValue(0, 10, 10, elapsedTime) - 5
    padOvertoneFourDetune = lfoValue(0, 15, 20, elapsedTime) - 7.5
    padOvertoneFiveDetune = lfoValue(0, 10, 50, elapsedTime) - 5
    padOvertoneSixDetune = lfoValue(0, 10, 75, elapsedTime) - 5
    padOvertoneSevenDetune = lfoValue(0, 10, 20, elapsedTime) - 5
    padOvertoneEightDetune = lfoValue(0, 20, 40, elapsedTime) - 10
    

    let bassSequencer = sequencer(elapsedTime, bassMetronomeTime, bassObj)
    // droneSequencer(elapsedTime, metronomeTime, droneSequence)
    bassPan.pan.value = Math.sin(elapsedTime) / 6


    // go through these and make sure frequencies are not stepping on eachother, compare with notes hz
    // DRONE FILTER SWEEP
    bassLfoFilterNode.frequency.value = lfoValue(50, 100, .5, elapsedTime)
    // PAD FILTER SWEEP
    // what is the center freq???
    bpFilterNodePad.frequency.value = lfoValue(150, 190, 10, elapsedTime) 
    // LEAD FILTER SWEEP
    bpFilterNodeLead.frequency.value = lfoValue(500, 1500, 10, elapsedTime)

    // LEAD OSC
    sphereParticles.rotation.z = elapsedTime * rotationSpeed   
    
    
    // ANIMATIONS 

    // LEAD ANIMATIONS ARE IN PARTICLE FOR LOOP

    // PAD ANIMATIONS
    removeStartTimesOfCompletedAnimations(elapsedTime, padStartTimeArray, padAnimationLength)
    let summedAnimationValues = sumAllAnimationValues(elapsedTime, padStartTimeArray, padAnimationLength)
    let clampedAnimationValuesSum = MathUtils.clamp(summedAnimationValues, 0 ,100)
    // let easeInEaseOutAnimationValues = easeInOutSine(clampedAnimationValuesSum)
    // console.log(easeInEaseOutAnimationValues)
    // change fib spiral pattern with pad play
    // could use non clamped vals but would need to know max value
    waveLength = mapV(clampedAnimationValuesSum, 0 , 1 , waveLength, waveLength + .000000002)
    // console.log(waveLength)
    // THIS COULD LOOK BETTER!!!
    const colorCenter = .55
    let saturationChange = mapV(clampedAnimationValuesSum, 1, 100, 0, .07)
    let newColorCenter = colorCenter - saturationChange
    let newColorAmplitude = 1.0 - newColorCenter
    
    // What if i didn't clamp and set max to animation completion * 2?
    let newAmplitude = amplitude + mapV(clampedAnimationValuesSum, 0, 100, 0 , .15)

    
    // DRONE ANIMATION
    // let innerRadius2 = mapV(bassLfoFilterNode.frequency.value, 39, 156, 5, 5.5)
    // LEAD ANIMATION
    // band animates from start of innerRadius to 
    
    let lowerBound = (innerRadius - newAmplitude) 
    let upperBound = (innerRadius + newAmplitude) 
    
    let leadAnimationPercentCompleteArray = createLeadAnimationPercentCompleteArray(elapsedTime, leadStartTimeArray, leadAnimationLength)
    let positionBetweenBoundsArray = createPositionBetweenBoundsArray(leadAnimationPercentCompleteArray, lowerBound, upperBound)

   

    removeStartTimesOfCompletedAnimations(elapsedTime,leadStartTimeArray,leadAnimationLength)

    for (let i = 0; i <= points; i++){
        const t = ((i / (points)));
        
        const polarAngle = Math.acos((1 - 2 * t));
        const azimuth = goldenAngleRadians * i;
        
        // is there a better name for this variable? Total Radius?
        let outerRadius = innerRadius + ((Math.sin(((elapsedTime * speedOfWaves) + (i * waveLength)))) * newAmplitude)
        // how do I send a pulse down the sine wave that multiplies outer radius?


        // three value chunk for xyz or rgb values
        let i3 = i * 3
        
        // spherical to cartesian 
        positions[i3] = Math.sin(polarAngle) * Math.cos(azimuth) * (outerRadius);     // x
        positions[i3 + 1] = Math.sin(polarAngle) * Math.sin(azimuth) * (outerRadius); // y
        positions[i3 + 2] = Math.cos(polarAngle) * (outerRadius) ; // z


        // color appears white when all rgb values are equal
        // rgb values are between 0 and 1 
        

        const zPosition = positions[i3 + 2]
        colors[i3] = ((Math.sin(elapsedTime + zPosition)*newColorAmplitude) + newColorCenter)// r
        colors[i3+ 1] = ((Math.sin((elapsedTime + zPosition)+2)*newColorAmplitude) + newColorCenter)// g
        colors[i3+2] = ((Math.sin((elapsedTime + zPosition)+4)*newColorAmplitude) + newColorCenter) // b

        changeColorOfParticlesWithinBandwidth(positionBetweenBoundsArray, outerRadius, i3, 1)
        easeInOutSine(changePositionParticlesWithinBandwidth(positionBetweenBoundsArray, polarAngle, azimuth, outerRadius, i3, 1))
        
        
    }


   
    fibSphereGeometry.attributes.position.needsUpdate = true
    fibSphereGeometry.attributes.color.needsUpdate = true


    // MIGRATE ARAY FROM CONTROLS UI
    controls.update()
    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}


tick()


// UI
import p5 from 'p5';

// Helper Funcs

function euclidianDistance(xOrigin,yOrigin, xPoint, yPoint){
    let dist = Math.sqrt((xPoint - xOrigin)**2 + (yPoint - yOrigin)**2)
    return dist
}

// CHANGE NUMBER OF PULSES

function changeNumberOfPulses (numberOfPulses, instrumentId) {
    // this is fucked up
    
    const instrumentMap = {
        'lead-pulses-input': leadObj,
        'pad-pulses-input':  padObj,
        'bass-pulses-input': bassObj,
    };

    const parentObj = instrumentMap[instrumentId];
    if (!parentObj) return;
    let instrumentObj = parentObj.instrument
    let metronomeObj = parentObj.metronome
    // study this
    // remainder of time after elpased time is divided by beats
    // returns the position of remainder of time after a beat, before the next beat starts
    let timeIntoCurrentBeat = (globalElapsedTime) % (60 / bpm);
    
    // MY ARRAY CHANGE
    let pulseBooleanArrayCopy = [...instrumentObj.pulseBooleanArray]

    if(numberOfPulses < pulseBooleanArrayCopy.length){
        pulseBooleanArrayCopy.length = numberOfPulses
    } else {
        while(pulseBooleanArrayCopy.length < numberOfPulses){
            pulseBooleanArrayCopy.push(false)
        }
    }
    parentObj.instrument.pulseBooleanArray = pulseBooleanArrayCopy
    console.log(
        'lead', leadObj.instrument.pulseBooleanArray,
        'pad', padObj.instrument.pulseBooleanArray,
        'bass', bassObj.instrument.pulseBooleanArray,
    )
    // GEMINI startTime change
    // STUDY THIS 
    // remove one pulse, 
    metronomeObj.startTime = globalElapsedTime - ((metronomeObj.currentPulse - 1) * (60 / bpm)) - timeIntoCurrentBeat;
    if (metronomeObj.currentPulse > instrumentObj.pulseBooleanArray.length){
        metronomeObj.currentPulse = instrumentObj.pulseBooleanArray.length -1
    }
}

const leadPulsesInput = document.getElementById('lead-pulses-input');
const padPulsesInput = document.getElementById('pad-pulses-input');
const bassPulsesInput = document.getElementById('bass-pulses-input');
// write this as a function
leadPulsesInput.addEventListener('input', (e)=>{
    let numberOfPulses = e.target.value
    let instrumentId = e.target.id
    console.log(instrumentId, numberOfPulses)
    changeNumberOfPulses(numberOfPulses, instrumentId)
})

padPulsesInput.addEventListener('input', (e)=>{
    let numberOfPulses = e.target.value
    let instrumentId = e.target.id
    changeNumberOfPulses(numberOfPulses, instrumentId)
})

bassPulsesInput.addEventListener('input', (e)=>{
    console.log(e)
    let numberOfPulses = e.target.value
    let instrumentId = e.target.id
    changeNumberOfPulses(numberOfPulses, instrumentId)
})

// THIS IS THE ANIMATED UI
// 4- repeat for all instruments

function creatCircleNotation (instrumentObj, parent){
    console.log('inst', instrumentObj)

    const circleNotation= (sketch) => {

        let canvasHeight = 200
        let canvasWidth = 200
        let originX = canvasWidth / 2
        let originY = canvasHeight / 2
        let circleDiameter = canvasHeight - 70
        let dotDiameter = 15
        let circleRadius = circleDiameter / 2
       
        // let pulseSeqLength = instrumentObj.instrument.pulseBooleanArray.length
        // let pulseSequence = instrumentObj.instrument. pulseBooleanArray

        // console.log(pulseSeqLength)
        // DOT/ONSET SELECT CLIC
        sketch.mouseClicked = () => {
            // problem here. clicks not overwriting old array
            for(let i = 0; i < instrumentObj.instrument.pulseBooleanArray.length; i++){
                let currentPulse = i
                let currentPulseBoolean = instrumentObj.instrument.pulseBooleanArray[currentPulse]
                
                const angle = (currentPulse / instrumentObj.instrument.pulseBooleanArray.length) * (Math.PI * 2) - Math.PI / 2;
                const dotX = originX + Math.cos(angle) * circleRadius;
                const dotY = originY + Math.sin(angle) * circleRadius;
                const dist = euclidianDistance(dotX, dotY, sketch.mouseX, sketch.mouseY);
                // sense click on dot
                if (dist < dotDiameter / 2){
                    instrumentObj.instrument.pulseBooleanArray[i] = !instrumentObj.instrument.pulseBooleanArray[i]
                };
            };
        };       
        
        console.log('inst2', instrumentObj)
        sketch.setup = () => {
                const container = document.getElementById('controls');
                sketch.createCanvas(canvasHeight, canvasWidth).parent(parent);
            };

        
        sketch.draw = () => {
     
            // CIRCLE 
            sketch.clear();
            sketch.noFill();
            sketch.stroke(255);
            sketch.strokeWeight(3);
            sketch.circle(originX, originY, circleDiameter);

            //DOTS FOR PULSES
            
            
            for(let i = 0; i < instrumentObj.instrument.pulseBooleanArray.length; i++){
                let currentPulse = i
                let currentPulseBoolean = instrumentObj.instrument.pulseBooleanArray[currentPulse]
                // console.log(currentPulseBoolean)
                const angle = (currentPulse / instrumentObj.instrument.pulseBooleanArray.length) * (Math.PI * 2) - Math.PI / 2
                const dotX = originX + Math.cos(angle) * circleRadius
                const dotY = originY + Math.sin(angle) * circleRadius

                const extraDistForText = 18
                const textX = originX + Math.cos(angle) * (circleRadius + extraDistForText)
                const textY = originY + Math.sin(angle) * (circleRadius + extraDistForText)

                
                // if circle selected, fill circle
                // im slightly confused as to why this works
                if (currentPulseBoolean == true){
                    sketch.fill(255)
                } else {
                    sketch.noFill();
                    sketch.strokeWeight(2.5);
                    sketch.stroke(255)
                }
               
                // this is the final dot draw
                sketch.circle(dotX,dotY,dotDiameter)

                // NUMBERS
                sketch.fill(255)
                sketch.textAlign(sketch.CENTER, sketch.CENTER);
                sketch.textStyle(sketch.NORMAL)
                sketch.textFont('Arial')
                sketch.textSize(12)
                sketch.strokeWeight(0.1)
                sketch.text(i + 1, textX, textY);
            }

            // Onset Select
            // shifted back to 12oclock with - pi*2
            // console.log(instrumentObj.timeWithinLoopSeconds, instrumentObj.totalLoopTime)
            let metronome = instrumentObj.metronome
            let loopPositionAngleRadians = mapV(metronome.timeWithinLoopSeconds, 0, metronome.totalLoopTime, 0 , (2 * Math.PI)) - Math.PI / 2
            // console.log(loopPositionAngleRadians)
            let loopPositionX = originX + Math.cos(loopPositionAngleRadians) * circleRadius
            let loopPositionY = originY + Math.sin(loopPositionAngleRadians) * circleRadius
            sketch.stroke('white')
            sketch.strokeWeight(2)
            sketch.line(originX, originY, loopPositionX, loopPositionY)
        };
    };
    return circleNotation
}

// this value appears not to change? 
// rename these variables
let circleNotationLead = creatCircleNotation(leadObj, 'lead-controls')
let circleNotationPad = creatCircleNotation(padObj, 'pad-controls')
let circleNotationBass = creatCircleNotation(bassObj, 'bass-controls')

new p5(circleNotationLead);
new p5(circleNotationPad);
new p5(circleNotationBass)


// NOTES ON SPHERE

// incriment by number of points in sphere
// for (let i = 0; i <= points; i++){
    
//     // normalize scale from point 0 to last point to 0 through 1
//     // this will be used to calculate polar angle, which uses arcosine to return an angle IN RADIANS from 0Pi to 2Pi
//     const t = ((i / (points)));
    
//     // Math.acos(1) = 0, when the ration of adj leg to hyp is 1/1
//     // Math.acos(0) = Pi/2, when ratio of adj leg to hyp 0/1
//     // Math.acos(-1) = Pi, when ratio of  adj leg to hyp is -1/1
//     // as cosine moves from 1, to 0, to -1, acos moves from 0 to Pi
//     // this Pi value is a radian (angle where arc length equals radius)
//     // 0*r = angle 0, Pi/4*r = 45 deg, Pi/2*r = 90 deg, Pi*r = 180 deg, 2Pi*r = 360 deg
    
//     // cosine takes an angle IN RADIANS, and returns the ratio of adjacent/hypotinuse
//     // arccosine takes a ratio  adjacent/hypotenuse) and returns an angle IN RADIANS
//     const polarAngle = Math.acos((1 - 2 * t));
//     // console.log('pa',radiansToDegrees(polarAngle))
//     // normalize from 1 to -1, the values that arccosine accepts
//     // 1 - (2 * 0) = 1 (start)
//     // 1 - (2*.5) = 0. (halfway)
//     // 1 -(2*1) = -1 (finish)

//     // sin and cos are always between 1 and -1, tan between neg infinity and infinity
//     // RADIANS 0*r = angle 0, Pi/4*r = 45 deg, Pi/2*r = 90 deg, Pi*r = 180 deg, 2Pi*r = 360 deg
//     // COS in degreees: cos(0) = 1, cos(90) = 0, cos(180) = -1

//     // INVERSE COSINE
//     // Math.acos is inverse cosine. Takes ratio, and returns RADIANS (only accepts values between -1 and 1)
//     // Math.acos(1) = 0. When ratio of adj/hyp = 1 (1/1), angle is 0 deg|0 radians
//     // Math.acos(0) = 1.57. When ratio of adj/hyp = 0 (0/1), angle is 90 deg|Pi/2 radians
//     // Math.acos(-1) = Pi. When ratio of adj/hyp  = -1 (-1/1), angle is 180 deg|Pi radians

//     // AZIMUTH is longitudinal rotation
//     // golden angle ensures that point in radial rotation is always placed in optimal position between closest two points
//     const azimuth = goldenAngleRadians * i;
//     // console.log('az rotations',(radiansToDegrees(azimuth)/360))

//     // SPHERICAL TO CARTESIAN COORDINATES
//     // i*3 lets us set 3 valuses each iteration (x,y,z)
//     if (i % 9 == 0){
//         let i3 = i * 3
//         positions[i3] = Math.sin(polarAngle) * Math.cos(azimuth) * radius;     // x
//         console.log('x', Math.sin(polarAngle) * Math.cos(azimuth) * radius,'sin pa', Math.sin(polarAngle), 'cos az', Math.cos(azimuth), 'pa', polarAngle, 'az', azimuth)
//         // Cosine of azimuth oscilates along x axis. Sine of polar angle modifies to account for height on y axis.
//         // start: PA 0, AZ 0. sin(0)=0. cos(0) = 1. 0*1*r = 0. x = 0
//         // midpoint: PA PI/2, AZ 13k. sin(PI/2) = 1. Cos(13k) = 1. 1*1*r = radius
//         // end: PA Pi, AZ 24k,  sin(pi)= 0. cos(24k) = -0.19. 0*0.19*r = 0
//         positions[i3 + 1] = Math.sin(polarAngle) * Math.sin(azimuth) * radius; // y
//         // DO THIS NEXT
//         // console.log('y', Math.sin(polarAngle) * Math.sin(azimuth) * radius)
//         positions[i3 + 2] = Math.cos(polarAngle) * radius; // z
//         // start: PA = 0, Cos(0) = 1. First point full length of radius.
//         // midpoint: PA = 90 | Pi/2, cos(Pi/2) = 0. Middle point at zero.
//         // end: PA = 180 | Pi, cos(Pi) = -1. endpoint radial length to negative z. 
//         // console.log('z', Math.cos(polarAngle) * radius,'cos', Math.cos(polarAngle), 'pa', polarAngle)
        
//         colors[i3] = 1.0
//         colors[i3+1] = 1.0
//         colors[i3+2] = 1.0
//     }
    
    
// }