import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import * as MathUtils from 'three/src/math/MathUtils.js'
import Stats from 'three/examples/jsm/libs/stats.module'
import Noise from 'noisejs'

/**
 * Base
 */
// Debug
const stats = Stats()
document.body.appendChild(stats.dom)

// const gui = new GUI({width : 800})

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

let points = 80000

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
let bpm = 20; // bpm here for rotation speed
let amplitude = 1 // number of peaks and valleys in wave
let speedOfWaves = .2
let rotationSpeed = mapV(bpm, 10, 40, .001, .15)
let waveLength = 1


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
 * RESPONSIVE WINDOW
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
// start suspended!
audioContext.suspend()

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

// currentScoreIndex vs scoreIndex?
function playLeadOsc(time, wave, attackTime, releaseTime, scoreIndex, scoreSequence) {
    // console.log('osc', scoreIndex, scoreSequence)
    // const notesLength = noteSequence.length
    // const scoreLength = scoreSequence.length
    const sweepLength = attackTime + releaseTime
    // const scoreNote= scoreSequence

    const leadFundamentalOsc = new OscillatorNode(audioContext, {
        frequency: scoreSequence[scoreIndex].note,
        type: wave,
        detune : leadOscDetune,
        
    });
    const leadFundamentalOscGain = audioContext.createGain();
    
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
    // ADVANCE SCORE INDEX
    // score needs to advance even if note isn't played. this functionality needs to be removed from play Osc
    // leadObj.instrument.scoreIndex = (scoreIndex + 1) % scoreSequence.length
    // console.log('lsi', leadObj.instrument.scoreIndex)
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

    const  chordScoreSequenceLength= chordSequence.length

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

function playBass(time, wave, attack, release, scoreSequence, scoreIndex){
    const scoreLength = scoreSequence.length
    // console.log(scoreSequence, scoreIndex)
    let frequency = scoreSequence[scoreIndex].note
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

    // Advance notes (DEBUG THIS)
    // bassObj.instrument.scoreIndex += 1
    // bassObj.instrument.scoreIndex = bassObj.instrument.scoreSequence.length - 1 % bassObj.instrument.scoreIndex
    // if (scoreIndex < scoreIndex.length - 1){
    //     bassObj.instrument.scoreIndex = bassObj.instrument.scoreIndex + 1
    // } else {
    //     bassObj.instrument.scoreIndex = 0
    // }
}

// change drone to bass in variables
const bassGainControl = document.querySelector("#bass-volume");

bassGainControl.addEventListener("input", () => {
  bassGain.gain.value = bassGainControl.value;
});

const leadGainControl = document.querySelector("#lead-volume");
leadGainControl.addEventListener("input", () => {
    // why does lead gain default to 1???
    leadGain.gain.value = leadGainControl.value;
});

const padGainControl = document.querySelector("#pad-volume");

padGainControl.addEventListener("input", () => {
  padGain.gain.value = padGainControl.value;
});

// SEQUENCER

function createScoreSequence(instrumentObject){
    let emptyScoreObj = { 
        note: null,  
        bool: null
    }
    let scoreSequence = []




}

// how do I make lead Note Sequence sound good at many lengths?
// would pulse array (rhtyhm) be better included in instrumentObj than metronomeObj? 

let leadNoteObj = {
    "D5":   587.33,
    "D#5":  622.25,
    "G5":   783.99,
    "A#5":  932.35,
    "D6":   1174.66
}

let leadSequenceObj = {
    2 : ["G5", "D5"],
    3 : ["G5", "D#5","D5"],
    4 : ["G5", "D#5", "A#5", "D5"],
    5 : ["G5", "D#5", "D5", "A#5", "D6"],
    6 : ["G5", "D#5", "D5", "D6", "A#5", "D6"],
    7 : ["G5", "D#5", "A#5", "D5", "D6", "A#5", "D6"],
    8 : ["G5", "D#5", "A#5", "D5", "D6", "G5", "D#5", "D6"],
    9 : ["G5", "D#5", "A#5", "D5", "D6", "G5", "D#5", "A#5", "D5"],
    10 : ["G5", "D#5", "A#5", "D5", "D6", "G5", "D#5", "A#5", "D5", "D6"],
    11 : ["G5", "D#5", "A#5", "G5", "D5", "D6", "G5", "D#5", "A#5", "D5", "D6"],
    12 : ["G5", "D#5", "A#5", "G5", "D5", "D6", "G5", "D#5", "A#5", "D5", "G5", "D6"]
}

let leadObj = {
    'instrument' : {
        type : 'lead',
        // G5 → D#5 → A#5 → D5 → D6 → G5 → D#5 → A#5 → D5
        // noteSequence: [783.99, 622.25, 932.35, 587.33, 1174.66, 783.99, 622.25, 932.35, 587.33], // remove this when done
        masterScoreSequence: [
                { note: 783.99,  bool: true }, // 1 - G5
                { note: 622.25,  bool: false }, // 2 - D#5 
                { note: 932.35,  bool: false }, // 3 - A#5
                { note: 783.99,  bool: true }, // 4 - G5
                { note: 587.33,  bool: true }, // 5 - D5
                { note: 1174.66, bool: false }, // 6 - D6
                { note: 783.99,  bool: false }, // 7 - G5
                { note: 622.25,  bool: true }, // 8 - D#5
                { note: 932.35,  bool: false }, // 9 - A#5
                { note: 783.99,  bool: false }, // 10 - G5
                { note: 587.33,  bool: true}, // 11 - D5
                { note: 1174.66, bool: false }, // 12 - D6
            ],
        workingScoreSequence : [],
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
// initiate leadObj workingScoreSequence
// replace with createScore function later
leadObj.instrument.workingScoreSequence = [...leadObj.instrument.masterScoreSequence]
    //["EbM7", "CM7", "EbM7inv", "CM7inv", "Bb7"]
let padChordObj = {
    "EbM7" : [311.13, 392, 587.33,  466.16], // check to see what chord it really is
    "EbM7inv" : [466.16, 587.33, 392.00, 311.13],
    "CM7" : [261.63, 311.13, 392.00, 466.16], // C, Eb, G, Bb — Cm7
    "CM7inv" : [466.16, 392.00, 311.13, 261.63],
    "BbM" : [233.08, 293.66, 349.23, 466.16], // Bb, D, F, Bb — BbM
    "BbM7" : [233.08, 293.66, 349.23, 440.00] // Bb, D, F, A 
}

let padSequenceObject = {
    2 : ["EbM7", "BbM"], 
    3 : ["EbM7", "CM7", "BbM"], 
    4 : ["EbM7", "CM7", "EbM7inv", "BbM"], 
    5 : ["EbM7", "CM7", "EbM7inv", "CM7inv", "BbM"],
    6 : ["EbM7", "CM7", "EbM7inv", "CM7inv", "EbM7", "BbM"],
    7 : ["EbM7", "CM7", "EbM7inv", "BbM7", "CM7inv", "EbM7", "BbM"],
    8 : ["EbM7", "CM7", "EbM7inv", "BbM7", "CM7inv", "EbM7", "CM7", "BbM"],
    9 : ["EbM7", "CM7", "EbM7inv", "CM7inv", "BbM7", "CM7inv", "EbM7", "CM7", "BbM"],
    10 : ["EbM7", "CM7", "EbM7inv", "CM7inv", "BbM7", "CM7inv", "EbM7", "CM7", "EbM7inv", "BbM"],
    11 : ["EbM7", "CM7", "EbM7inv", "CM7inv", "BbM", "BbM7", "CM7inv", "EbM7", "CM7", "EbM7inv", "BbM"],
    12 : ["EbM7", "CM7", "EbM7inv", "CM7inv", "BbM", "BbM7", "CM7inv", "EbM7", "CM7", "EbM7inv", "BbM", "BbM7"],
}

let padObj = {
    'instrument' : {
        type : 'pad',
        // chordSequence: ["EbM7", "CM7", "EbM7inv", "CM7inv", "Bb7"],
        masterScoreSequence: [
            {note : "EbM7" , bool : true}, 
            {note : "CM7", bool : false}, 
            {note : "EbM7inv", bool : false},
            {note : "CM7inv", bool : false},
            {note : "Bb7", bool : false},
            {note : "EbM7" , bool : true}, 
            {note : "CM7", bool : false}, 
            {note : "EbM7inv", bool : false},
            {note : "CM7inv", bool : false},
            {note : "EbM7inv", bool : false},
            {note : "CM7inv", bool : false},
            {note : "Bb7inv", bool : true},
        ],
        workingScoreSequence : [],
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
// initiate padObj workingScoreSequence
// replace with createScore function later
padObj.instrument.workingScoreSequence = [...padObj.instrument.masterScoreSequence]

let bassNoteObj = {
    "D#3": 155.562,
    "D3" : 146.83, // tension? 
    "A#2": 116.54,
    "C3": 130.81
}

let bassSequenceObject = {
    2 : ["D#3", "C3"],
    3 : ["D#3", "A#2", "C3"],
    4 : ["D#3", "A#2", "D#3", "C3"],
    5 : ["D#3", "A#2", "C3", "D#3", "C3"],
    6 : ["D#3", "A#2", "C3", "D#3" , "A#2", "C3"],
    7 : ["D#3", "A#2", "C3", "D#3" , "A#2", "D#3", "C3"],
    8 : ["D#3", "A#2", "D#3", "C3", "D#3", "A#2", "D#3", "C3"],
    9 : ["D#3", "A#2", "C3", "D#3", "A#2", "C3", "D#3", "A#2", "C3"],
    10 : ["D#3", "A#2", "C3", "D#3", "C3","D#3", "A#2", "C3", "D#3", "C3"],
    11 : ["D#3", "A#2", "C3", "D#3", "A#2", "C3", "D#3", "A#2", "C3", "D#3", "C3"],
    12 : ["D#3", "A#2", "C3", "D#3" ,"A#2", "C3", "D#3", "A#2", "C3", "D#3" , "A#2", "C3"],
}

let bassObj = {
    'instrument' : {
        type : 'bass',
        // keep above 100 and lower than 200 to not step on pad
        // Eb3 → Bb2 → C3 → Bb2
        noteSequence: [155.562, 116.54, 130.81, 116.54],
        masterScoreSequence : [
            {note : 155.562 , bool : true}, // Eb3
            {note : 116.54 , bool : false}, // Bb2
            {note : 130.81 , bool : false}, // C3
            {note : 116.54 , bool : true}, // Bb2
            {note : 155.562 , bool : true}, // Eb3
            {note : 116.54 , bool : false}, // Bb2
            {note : 130.81 , bool : false}, // C3
            {note : 116.54 , bool : true}, // Bb2
            {note : 155.562 , bool : true}, // Eb3
            {note : 116.54 , bool : false}, // Bb2
            {note : 130.81 , bool : false}, // C3
            {note : 116.54 , bool : true}, // Bb2
        ],
        workingScoreSequence : [],
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
// initiate bassObj workingScoreSequence
// replace with createScore function later
bassObj.instrument.workingScoreSequence = [...bassObj.instrument.masterScoreSequence]

// Each instrument has its own sequencer, since it posesses its own 
// time used to trigger osc, metronome beat used to check if instrumentObj.scoreSequence[metronomeBeat].bool is t or f
// instrumentObj's lastPlayedBeat is updated after instrumentOscPlay funcs are added to array and invoked in a loop
function sequencer(time, metronomeBeat, instrumentObj){
    
    // PART I
    // push instrumentPlayOsc functions to playOscArray if instrumentScore[currentMetronomeBeat] is true

    let instrumentType = instrumentObj.instrument.type
    // scoreSequence combines noteSequence and PulseArray
    let instrumentScoreSequence = instrumentObj.instrument.workingScoreSequence
   
    // metronomeBeat starts at 1, scoreSequence is zero indexed
    let metronomeBeatZeroIndex = metronomeBeat - 1
    let currentScoreSequenceBoolean = instrumentScoreSequence[metronomeBeatZeroIndex].bool

    // playOscArray will contain playOscFunctions for each instrument
    // playOsc pushed to array when instrumentScoreSequence[metronomeBeat] is true
    let playOscArray = []
    if (instrumentType == 'lead'){
        if (currentScoreSequenceBoolean == true){
            let playOsc = () => playLeadOsc(time, 'triangle', 0.1, 1, metronomeBeatZeroIndex, instrumentScoreSequence);
            playOscArray.push(playOsc)
        }
    } else if (instrumentType == 'pad'){
        // this could be a function like the others
        // currently is not because it loops to play individual notes from a chord
        // console.log('pad chord', 
        //     'bool', instrumentScoreSequence[metronomeBeatZeroIndex].bool,
        //     'chord', instrumentScoreSequence[metronomeBeatZeroIndex].note
        // )
        if (currentScoreSequenceBoolean == true){
            let chordSequence = instrumentObj.instrument.workingScoreSequence
            let currentChord = instrumentScoreSequence[metronomeBeatZeroIndex].note
            let currentChordNotes = padChordObj[currentChord]
            let timeStagger = 0
            // loop through and play individual notes of chord
            for (let i = 0; i < currentChordNotes.length; i++){
                let chordNote = currentChordNotes[i]
                let playOsc = () => playAdditivePad(time + timeStagger, "sine", chordNote, chordSequence, metronomeBeatZeroIndex)
                playOscArray.push(playOsc)
                timeStagger += .5
            }
        }
    } else if (instrumentType === 'bass'){
        if (currentScoreSequenceBoolean == true){
            let playOsc = () => playBass(time, 'sine', 1.2, 2, instrumentScoreSequence, metronomeBeatZeroIndex)
            playOscArray.push(playOsc)
        }
    }
    
    // PART II
    // check currentBeat against lastPlayedBeat
    // if metronomeBeat is ahead of last played beat, invoke all the instrumentOscPlay functions and updateLastPlayedBeat
    // add start times of instruments to animationStarTimeArrays 
    if (instrumentObj.instrument.lastPlayedBeat !== metronomeBeatZeroIndex && currentScoreSequenceBoolean == true){
        // play all oscilators pushed to array. lead and bass only have one, pad has 4 (currentley)
        // create oscPlayFunc and invoke it for each instrumentOscPlay of the array
        for (const ocsPlayFunc of playOscArray){
            ocsPlayFunc()
        }
        // add start times to animationStartTimeArrays
        if (instrumentObj.instrument.type == 'pad'){
            padAnimationStartTimeArray.push(time)
        } else if (instrumentObj.instrument.type == 'lead'){
            leadAnimationStartTimeArray.push(time)
        } else if (instrumentObj.instrument.type == 'bass'){
            bassAnimationStartTimeArray.push(time)
        }
        instrumentObj.instrument.lastPlayedBeat = metronomeBeatZeroIndex
    } 
}

// METRONOME


function metronome(currentTime, instrumentObj, bpm){
    let beatLengthSeconds = 60.0 / bpm;
    instrumentObj.metronome.totalLoopTime = beatLengthSeconds * instrumentObj.instrument.workingScoreSequence.length

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
    return -(Math.cos(Math.PI * value) - 1) / 2;
}

// ANIMATION GLOBAL VARS

let padAnimationStartTimeArray = []
// ofset to compensate for slow attack? 
// const padAnimationOffset = -3
const padAnimationLength = 18

let leadAnimationStartTimeArray = []
const leadAnimationLength = 3 

// radius increase? maybe pad only does wavelength increse and not amplitude? 
let bassAnimationStartTimeArray = []
const bassAnimationLength = 4.5

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
    let value = 100 * (1 - Math.abs((percentCompleteAnimation / 50) - 1))
    return value
}

// EASING FUNC ADDED FOR INDIVIDUAL PERCENTAGES
function sumStartTimeArrayCompletionPercentages(elapsedTime, startTimeArray, animationLength){
    let res = 0
    if (startTimeArray.length === 0){
        return 0
    } else {
        for (let i = 0; i < startTimeArray.length; i++ ){
            let currentStartTime = startTimeArray[i]
            let percentageComplete = returnPercentCompleteAnimation(elapsedTime, currentStartTime, animationLength)
            let individualAnimationValue = raiseAndLowerAnimationValueTo100(percentageComplete)
            let individualAnimationValueMappedZeroToOne = individualAnimationValue / 100
            let easedIndividualAnimationValue = easeInOutSine(individualAnimationValueMappedZeroToOne)
            let easedValueMappedZeroToOneHundred = easedIndividualAnimationValue * 100 
            res += easedValueMappedZeroToOneHundred
        }
        return res
    }
}

// LEAD ANIMATION FUNCTIONS

function createAnimationPercentCompleteArray(elapsedTime, startTimeArray, leadAnimationLength){
    let percentCompleteArray = []
    if (startTimeArray.length == 0){
        return []
    } else {
        for (let i = 0; i < startTimeArray.length; i ++){
            let currentStartTime = startTimeArray[i]
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

// START ANIMATION

const startStopButton = document.getElementById("start-button")

let myNoise = new Noise.Noise

function addNoiseToPosition(summedAnimationCompletionValues, i3, time){
    let normalizedAnimationCompletionValues = summedAnimationCompletionValues/100 // 0-1
    let easedValues = easeInOutSine(normalizedAnimationCompletionValues)
    let noiseAmmount = mapV(easedValues, 0, 1, 0, .15)
    let noiseDistance = myNoise.simplex3(positions[i3], positions[i3 + 1], time)

    let displacement = noiseDistance * (noiseAmmount)

    positions[i3] = positions[i3] += displacement ;     // x
    positions[i3 + 1] = positions[i3 + 1] += displacement; // y
    positions[i3 + 2] = positions[i3 + 2] += displacement ; // z
}

// globalTime, animationTime, play/pause
let globalElapsedTime = null
let pauseTime = 0
// state begins paused, and is resumed (unsuspending audio, too)
let animationState = {
    isPaused: true,
    // this is the working animation time for the program
    animationTime: null,
    // this is the time at which the animation was paused, or should it be a delta?
    timePaused: globalElapsedTime - pauseTime
}



startStopButton.addEventListener('click', ()=>{
    if (animationState.isPaused == true){
        // unpause: set pauseTime to null
        pauseTime = null
        animationState.isPaused = false
        audioContext.resume()
        startStopButton.innerHTML = "="
    } else if (animationState.isPaused == false) {
        // pause: use animation time, not global elapsed time, as the pause point
        pauseTime = animationState.animationTime
        animationState.isPaused = true
        audioContext.suspend()
        startStopButton.innerHTML = ">"
    }
})

// wavelength
const wavelengthSlider = document.getElementById("wavelength-slider")

wavelengthSlider.addEventListener('input', ()=>{
    waveLength = parseFloat(wavelengthSlider.value)
})

wavelengthSlider.addEventListener('wheel', (e)=>{
    e.preventDefault(); // stop the page from scrolling

  const step = Number(wavelengthSlider.step) || 1;
  const min = Number(wavelengthSlider.min);
  const max = Number(wavelengthSlider.max);

  // deltaY < 0 means scrolling up
  let newValue = Number(wavelengthSlider.value) + (e.deltaY < 0 ? step : -step);

  // clamp to min/max
  newValue = Math.min(max, Math.max(min, newValue));

  wavelengthSlider.value = newValue;

    waveLength = parseFloat(newValue)

  // fire an input event so any listeners (e.g. a live label) update
  wavelengthSlider.dispatchEvent(new Event('input', { bubbles: true }));
})
/**
 * Animate
 */

const clock = new THREE.Clock()


const tick = () =>
{   
    const elapsedTime = clock.getElapsedTime();
    globalElapsedTime = elapsedTime

    if (animationState.isPaused == true){
        // while paused, animationTime freezes on pauseTime, start saving time paused. 
        animationState.animationTime = pauseTime 
        animationState.timePaused = globalElapsedTime - pauseTime
    } else if (animationState.isPaused == false){
        // when unpausing, animationTime begins at pause time + elapsed time - time paused
        animationState.animationTime = pauseTime + (globalElapsedTime - animationState.timePaused)
    }

    stats.update()

    // PARTICLE ROTATION
    // rotation speed linked to bpm?
    // rotationSpeed = 0 // temp turned off!
    sphereParticles.rotation.z = -(animationState.animationTime * rotationSpeed ) 

    // INSTRUMENT MENTRONOMES
    let leadMetronomeTime = metronome(animationState.animationTime,  leadObj, bpm);
    let padMetronomeTime = metronome(animationState.animationTime, padObj, bpm);
    let bassMetronomeTime = metronome(animationState.animationTime, bassObj, bpm)
   
    // INSTRUMENT SEQUENCERS & GLOBAL VAR MODULATORS
    let leadSequencer = sequencer(animationState.animationTime, leadMetronomeTime, leadObj)
    // sinwave controlled tremelo on lead gain node
    tremGain.gain.value = lfoValue(.5, 1.5, 40, animationState.animationTime)
    // lead fast shallow pitch modulation
    leadOscDetune = lfoValue(0, 6, 10000, animationState.animationTime) - 3
 
    let padSequencer = sequencer(animationState.animationTime, padMetronomeTime, padObj)
    // individual fundamental osc detunes 
    padOvertoneOneDetune = lfoValue(0, 10, 10, animationState.animationTime) - 5
    padOvertoneFourDetune = lfoValue(0, 15, 20, animationState.animationTime) - 7.5
    padOvertoneFiveDetune = lfoValue(0, 10, 50, animationState.animationTime) - 5
    padOvertoneSixDetune = lfoValue(0, 10, 75, animationState.animationTime) - 5
    padOvertoneSevenDetune = lfoValue(0, 10, 20, animationState.animationTime) - 5
    padOvertoneEightDetune = lfoValue(0, 20, 40, animationState.animationTime) - 10
    
    let bassSequencer = sequencer(animationState.animationTime, bassMetronomeTime, bassObj)
    // bass pan
    bassPan.pan.value = Math.sin(animationState.animationTime) / 6


    // go through these and make sure frequencies are not stepping on eachother, compare with notes hz
    // DRONE FILTER SWEEP
    bassLfoFilterNode.frequency.value = lfoValue(50, 100, .5, animationState.animationTime)
    // PAD FILTER SWEEP
    // what is the center freq???
    bpFilterNodePad.frequency.value = lfoValue(150, 190, 10, animationState.animationTime) 
    // LEAD FILTER SWEEP
    bpFilterNodeLead.frequency.value = lfoValue(500, 1500, 10, animationState.animationTime)

 
    
    
    // ANIMATIONS 

    // PAD ANIMATIONS
    
    let summedPadAnimationValues = sumStartTimeArrayCompletionPercentages(animationState.animationTime, padAnimationStartTimeArray, padAnimationLength)
    // let maximumPadArrayValue = padAnimationStartTimeArray.length * padAnimationLength // this jumps, could possibly figure out max with overlap of animations and beat length
    let padUpperClampLimit = 150
    let clampedPadAnimationValuesSum = MathUtils.clamp(summedPadAnimationValues, 0 ,padUpperClampLimit)
    // easeInEaseOutSine takes value from 0-1 and outputs smoothed value from 0-1, check these input values
    // individual values are eased, AND summed array values are eased approaching clamp value
    let easeInEaseOutPAdAnimationValues = easeInOutSine(clampedPadAnimationValuesSum / padUpperClampLimit)
    // dont += to global vars, use global var aas base and then manpulate new variable in funciton
    let waveLengthLowerLimit = waveLength
    let wavelengthUpperLimit = waveLength + .00005
    // temp swapped newwl with wl
    let newWaveLength =  mapV(easeInEaseOutPAdAnimationValues, 0 , 1 , waveLengthLowerLimit, wavelengthUpperLimit)
    const colorCenter = .57
    let saturationChange = mapV(easeInEaseOutPAdAnimationValues, 0, 1, 0, .1)
    let newColorCenter = colorCenter - saturationChange
    let newColorAmplitude = 1.0 - newColorCenter
    
    // amplitude plus pad animation animation addition
    let newAmplitude = amplitude + mapV(clampedPadAnimationValuesSum, 0, 1, 0 , .001)

    
    // BASS ANIMATION
    // controling inner radius OR random particle 'buzz'
    // let bassAnimationPercentCompleteArray = createAnimationPercentCompleteArray(elapsedTime, bassAnimationStartTimeArray, bassAnimationLength)
    let summedBassAnimations = sumStartTimeArrayCompletionPercentages(animationState.animationTime, bassAnimationStartTimeArray, bassAnimationLength)
    // to clamp or not to clamp?
    // console.log(summedBassAnimations)
    
    // LEAD ANIMATION (position between bounds array stores info for animation that takes place in particle loop)
    // band animates from start of innerRadius to inneRadius + amplitude
   
    let lowerBound = (innerRadius - newAmplitude) 
    let upperBound = (innerRadius + newAmplitude) 
    
    let leadAnimationPercentCompleteArray = createAnimationPercentCompleteArray(animationState.animationTime, leadAnimationStartTimeArray, leadAnimationLength)
    let positionBetweenBoundsArray = createPositionBetweenBoundsArray(leadAnimationPercentCompleteArray, lowerBound, upperBound)

   
    // clear start times that are longer than animation time
    removeStartTimesOfCompletedAnimations(animationState.animationTime,leadAnimationStartTimeArray,leadAnimationLength)
    removeStartTimesOfCompletedAnimations(animationState.animationTime, padAnimationStartTimeArray, padAnimationLength)
    removeStartTimesOfCompletedAnimations(animationState.animationTime, bassAnimationStartTimeArray, bassAnimationLength)

    // SPHERE PARTICLE POSITIONS
    for (let i = 0; i <= points; i++){
        const t = ((i / (points)));
        
        const polarAngle = Math.acos((1 - 2 * t));
        const azimuth = goldenAngleRadians * i;
        
        //newAmplitude = 0
        //innerRadius = 3
        // is there a better name for this variable? Total Radius? 
        // newWavelength and waveLength? how do I reconcile these two? 

        let sineWaveAmplitude = innerRadius + ((Math.sin(((animationState.animationTime * speedOfWaves) + (i * newWaveLength)))) * newAmplitude)
        // how do I send a pulse down the sine wave that multiplies outer radius?

        // three value chunk for xyz or rgb values
        let i3 = i * 3
        
        // spherical to cartesian 
        positions[i3] = Math.sin(polarAngle) * Math.cos(azimuth) * (sineWaveAmplitude);     // x
        positions[i3 + 1] = Math.sin(polarAngle) * Math.sin(azimuth) * (sineWaveAmplitude); // y
        positions[i3 + 2] = Math.cos(polarAngle) * (sineWaveAmplitude) ; // z

        // color appears white when all rgb values are equal
        // rgb values are between 0 and 1 
        const zPosition = positions[i3 + 2]
        colors[i3] = ((Math.sin(animationState.animationTime + zPosition)*newColorAmplitude) + newColorCenter)// r
        colors[i3+ 1] = ((Math.sin((animationState.animationTime + zPosition)+2)*newColorAmplitude) + newColorCenter)// g
        colors[i3+2] = ((Math.sin((animationState.animationTime + zPosition)+4)*newColorAmplitude) + newColorCenter) // b

        // lead animation white gradient band
        changeColorOfParticlesWithinBandwidth(positionBetweenBoundsArray, sineWaveAmplitude, i3, 1)
        // easing func for radius displacement of particles within gradient 
        // check if this value is 0 to 1? 
        easeInOutSine(changePositionParticlesWithinBandwidth(positionBetweenBoundsArray, polarAngle, azimuth, sineWaveAmplitude, i3, 1))
        
        // bass animation buzz? xyz randomness?
        addNoiseToPosition(summedBassAnimations, i3, animationState.animationTime)
    }


   
    fibSphereGeometry.attributes.position.needsUpdate = true
    fibSphereGeometry.attributes.color.needsUpdate = true


    // MIGRATE ARAY FROM CONTROLS UI
    controls.update()
    // Render
    renderer.render(scene, camera)
    // console.log(rotationSpeed)  
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
    let timeIntoCurrentBeat = (animationState.animationTime) % (60 / bpm);
    
    // MY ARRAY CHANGE
    // let pulseBooleanArrayCopy = [...instrumentObj.pulseBooleanArray]
    let scoreSequenceCopy = [...instrumentObj.workingScoreSequence]

    // mod operator instead of if else?
    if(numberOfPulses < workingScoreSequence.length){
        // shorten scoreSequence (cut one off workingScoreSequence)
        scoreSequenceCopy.length = numberOfPulses
        // pulseBooleanArrayCopy.length = numberOfPulses
    } else {
        while(scoreSequenceCopy.length < numberOfPulses){
            // push obj from masterScoreSequence at index 
            let masterScoreSequenceObj = instrumentObj.instrument.masterScoreSequence[numberOfPulses]
            // initialize false
            masterScoreSequenceObj.bool = false
            pulseBooleanArrayCopy.push(masterScoreSequenceObj)
        }
    }
    parentObj.instrument.workingScoreSequence = scoreSequenceCopy
    
    // GEMINI startTime change
    // STUDY THIS 
    // remove one pulse, 
    metronomeObj.startTime = animationState.animationTime - ((metronomeObj.currentPulse - 1) * (60 / bpm)) - timeIntoCurrentBeat;
    if (metronomeObj.currentPulse > instrumentObj.workingScoreSequence.length){
        metronomeObj.currentPulse = instrumentObj.workingScoreSequence.length -1
    }
}

const leadPulsesInput = document.getElementById('lead-pulses-input');
const padPulsesInput = document.getElementById('pad-pulses-input');
const bassPulsesInput = document.getElementById('bass-pulses-input');
const bpmInput = document.getElementById('bpm-slider');
// const bpmDisplay = document.getElementById('bpm-number');
// bpmDisplay.textContent = "BPM: " + bpmInput.value

// bpm is linked to rotationSpeed
bpmInput.addEventListener('input', () => {

    // bpmDisplay.textContent = "BPM: " + bpmInput.value;
    bpm = bpmInput.value
    let newRotationSpeed = mapV(bpmInput.value, 10, 40, .01, .15)
    rotationSpeed = newRotationSpeed
});


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
        let dotDiameter = 20
        let circleRadius = circleDiameter / 2
       
        // let pulseSeqLength = instrumentObj.instrument.pulseBooleanArray.length
        // let pulseSequence = instrumentObj.instrument. pulseBooleanArray

        // console.log(pulseSeqLength)
        // DOT/ONSET SELECT CLIC
        sketch.mouseClicked = () => {
            // there should be a dot for 
            for(let i = 0; i < instrumentObj.instrument.workingScoreSequence.length; i++){
                let currentPulse = i
                // let currentPulseBoolean = instrumentObj.instrument.pulseBooleanArray[currentPulse]
                // console.log(currentPulseBoolean)
                const angle = (currentPulse / instrumentObj.instrument.workingScoreSequence.length) * (Math.PI * 2) - Math.PI / 2;
                const dotX = originX + Math.cos(angle) * circleRadius;
                const dotY = originY + Math.sin(angle) * circleRadius;
                const dist = euclidianDistance(dotX, dotY, sketch.mouseX, sketch.mouseY);
                // sense click on dot, ! operator reverses boolean in pulseBooleanArray
                if (dist < dotDiameter / 2){

                    instrumentObj.instrument.workingScoreSequence[i].bool = !instrumentObj.instrument.workingScoreSequence[i].bool
                    // instrumentObj.instrument.workingScoreSequence[i] = !instrumentObj.instrument.pulseBooleanArray[i]
                };
            };
        };       
        
        // console.log('inst2', instrumentObj)
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
            
            // one dot for leangth of workingScoreSequence
            for(let i = 0; i < instrumentObj.instrument.workingScoreSequence.length; i++){
                let currentPulse = i
                // IS THERE A SCORESEQUENCE CURRENTPULSE?
                let currentPulseBoolean = instrumentObj.instrument.workingScoreSequence[currentPulse].bool
                // console.log('cpb',currentPulseBoolean)
                const angle = (currentPulse / instrumentObj.instrument.workingScoreSequence.length) * (Math.PI * 2) - Math.PI / 2
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