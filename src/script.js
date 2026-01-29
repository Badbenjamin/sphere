import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
// import { GodRaysCombineShader } from 'three/examples/jsm/Addons.js'
// import { element, notEqual } from 'three/tsl'
// import {chorusStrings} from '../wavetables/Chorus_Strings.js'
// console.log(chorusStrings)
/**
 * Base
 */
// Debug
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
const lineGeometry = new THREE.BufferGeometry()

let points = 100000

let innerRadius = 5
const goldenRatio = (1 + Math.sqrt(5)) / 20;
const goldenAngleRadians = Math.PI * 2 * goldenRatio;
// console.log(goldenRatio)

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
    scopeOn : true
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
gui.add( guiParams, 'rotationSpeed', 0, 1, .01 ).onChange(value =>{
    rotationSpeed = value
});
gui.add( guiParams, 'waveLength', 0,(Math.PI), .00005 ).onChange(value =>{
    waveLength = value
});

gui.add( guiParams, 'scopeOn' );

const waveLengthDiv = document.getElementById('wavelength')

function radiansToDegrees(radians){
    return radians * (180/Math.PI)
}
// console.log(radiansToDegrees(goldenAngleRadians))


// for each point, we need 3 positions, so positions is 3x points. 
const positions = new Float32Array(points * 3) // each point requires xyz cordinates
const linePositions = new Float32Array(points * 3)
const colors = new Float32Array(points * 3) // each point requires rbg values
const lineColor = new Float32Array(points * 3)



fibSphereGeometry.setAttribute(
    'position',
    // specify that there are 3 values for each position
    new THREE.BufferAttribute(positions, 3)
)

lineGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(linePositions, 3)
)

fibSphereGeometry .setAttribute(
    'color',
    new THREE.BufferAttribute(colors, 3)
)

lineGeometry.setAttribute(
    'color',
    new THREE.BufferAttribute(lineColor, 3)
)

const particlesMaterial = new THREE.PointsMaterial({
    size : 0.15,
    sizeAttenuation: true
})

const lineParticlesMaterial = new THREE.PointsMaterial({
    size : 0.2,
    sizeAttenuation: true
})
// particlesMaterial.color = new THREE.Color('lightgreen')
particlesMaterial.transparent = true
particlesMaterial.alphaMap = particleTexture
particlesMaterial.depthWrite = false
particlesMaterial.vertexColors = true
particlesMaterial.blendAlpha = false

lineParticlesMaterial.transparent = true
lineParticlesMaterial.alphaMap = particleTexture
lineParticlesMaterial.depthWrite = false
lineParticlesMaterial.vertexColors = true
lineParticlesMaterial.blendAlpha = false

// Points
// same as mesh, geometry and material
const sphereParticles= new THREE.Points(fibSphereGeometry , particlesMaterial)
const lineParticles = new THREE.Points(lineGeometry, lineParticlesMaterial)
sphereParticles.name = 'sphereParticles'
lineParticles.name = 'lineParticles'

scene.add(sphereParticles)
scene.add(lineParticles)


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


function checkForChildName(scene, name){
    let childPresent = false
    scene.children.map((child)=>{
        if (child['name'] == name){
            childPresent = true
        } 
    })
    return childPresent
}

function getWaveInfo(points, waveLength){
    // return range between peak and trough when found
    // return number of waves in points
    let wavelengths = []
    let count = 0
   
    for (let i = 1; i <= points - 1; i++){
        // console.log(i-1)
        const left = i - 1;
        const middle = i;
        const right = i + 1;

        const leftSineValue = Math.sin(left * waveLength) 
        const middleSineValue = Math.sin(middle * waveLength)
        const rightSineValue = Math.sin(right * waveLength) 
        
        if((leftSineValue < middleSineValue) && (middleSineValue > rightSineValue)){
            let currentPeak = middle;
            count += 1;
            wavelengths.push(currentPeak)
        } 
    }
    return points / count
}

// AUDIO

const audioContext = new AudioContext();


// LEAD

// LEAD FILTER 

const bpFilterNodeLead = audioContext.createBiquadFilter();
bpFilterNodeLead.type = 'bandpass'
// bpFilterNode.frequency.value = 250
bpFilterNodeLead.Q.value = '5'
let bpFilterLeadMin = 500
let bpFilterLeadMax = 1500
let bpFilterLeadSpeed = 10
// const noteSequence = [622.55, 739.99, 830.61, 932.33, 1244.51]
const noteSequence = [783.99, 622.25, 932.35, 587.33, 1174.66, 783.99, 622.25, 932.35, 587.33]
let noteIndex = 0
const attackTime = .1
const releaseTime = 1
const sweepLength = attackTime + releaseTime
const leadGain = audioContext.createGain();
const tremGain = new GainNode(audioContext)
function playLeadOsc(time, noteSequence, currentNote) {
    const notesLength = noteSequence.length
    // console.log(currentNote)
    const leadFundamentalOsc = new OscillatorNode(audioContext, {
        frequency: noteSequence[currentNote],
        type: "sine",
    });
    const leadFundamentalOscGain = audioContext.createGain();

    // add more fundamentals to beef up sound
    // const leadOvertoneOneOsc = new OscillatorNode(audioContext, {
    //     frequency: leadFundamentalOsc.frequency.value * 2,
    //     type: "sine",
    // });
    // const leadOvertoneOneGain = audioContext.createGain();

    // const leadOvertoneTwoOsc = new OscillatorNode(audioContext, {
    //     frequency: leadFundamentalOsc.frequency.value * 2,
    //     type: "sine",
    // });
    // const leadOvertoneTwoGain = audioContext.createGain();

    // const leadOvertoneThreeOsc = new OscillatorNode(audioContext, {
    //     frequency: leadFundamentalOsc.frequency.value * 3,
    //     type: "sine",
    // });
    // const leadOvertoneThreeGain = audioContext.createGain();

    // const leadOvertoneFourOsc = new OscillatorNode(audioContext, {
    //     frequency: leadFundamentalOsc.frequency.value * 4,
    //     type: "sine",
    // });
    // const leadOvertoneFourGain = audioContext.createGain();

    // const leadOvertoneFiveOsc = new OscillatorNode(audioContext, {
    //     frequency: leadFundamentalOsc.frequency.value * 5,
    //     type: "sine",
    // });
    // const leadOvertoneFiveGain = audioContext.createGain();

    // this appears to only fire when the function is called, and not throughout the oscilator's lifespan
    // I would need to create osc nodes outside of the function to get this to work
    
    // let detuneRange = 50
    // let detuneSinValue = ((Math.sin(time * 1000) * detuneRange) / 2)
    // osc.detune.value = detuneSinValue

    // Attack Release Gain Sweep

    // const sweepEnv = new GainNode(audioContext);
    // sweepEnv.gain.cancelScheduledValues(time);
    // sweepEnv.gain.setValueAtTime(0, time);
    // sweepEnv.gain.linearRampToValueAtTime(1, (time) +attackTime);
    // sweepEnv.gain.linearRampToValueAtTime(0, (time) +(attackTime + releaseTime));

    // leadFundamentalOscGain.gain.cancelScheduledValues(time);
    // leadFundamentalOscGain.gain.setValueAtTime(0, time);
    // leadFundamentalOscGain.gain.linearRampToValueAtTime(1, (time) +attackTime);
    // leadFundamentalOscGain.gain.linearRampToValueAtTime(0, (time) +(attackTime + releaseTime));

    // leadOvertoneOneGain.gain.cancelScheduledValues(time);
    // leadOvertoneOneGain.gain.setValueAtTime(0, time);
    // leadOvertoneOneGain.gain.linearRampToValueAtTime(.5, (time) +releaseTime);
    // leadOvertoneOneGain.gain.linearRampToValueAtTime(0, (time) +(attackTime + releaseTime));

    // leadOvertoneTwoGain.gain.cancelScheduledValues(time);
    // leadOvertoneTwoGain.gain.setValueAtTime(0, time);
    // leadOvertoneTwoGain.gain.linearRampToValueAtTime(.4, (time) +(attackTime * 2));
    // leadOvertoneTwoGain.gain.linearRampToValueAtTime(0, (time) +(attackTime + releaseTime));

    // leadOvertoneThreeGain.gain.cancelScheduledValues(time);
    // leadOvertoneThreeGain.gain.setValueAtTime(0, time);
    // leadOvertoneThreeGain.gain.linearRampToValueAtTime(.3, (time) +(attackTime));
    // leadOvertoneThreeGain.gain.linearRampToValueAtTime(0, (time) +(attackTime + releaseTime * 1.5));

    // leadOvertoneFourGain.gain.cancelScheduledValues(time);
    // leadOvertoneFourGain.gain.setValueAtTime(0, time);
    // leadOvertoneFourGain.gain.linearRampToValueAtTime(.2, (time) +(attackTime * 1.5));
    // leadOvertoneFourGain.gain.linearRampToValueAtTime(0, (time) +(attackTime + releaseTime / 2));

    // leadOvertoneFiveGain.gain.cancelScheduledValues(time);
    // leadOvertoneFiveGain.gain.setValueAtTime(0, time);
    // leadOvertoneFiveGain.gain.linearRampToValueAtTime(.1, (time) +(attackTime * 2));
    // leadOvertoneFiveGain.gain.linearRampToValueAtTime(0, (time) +(attackTime + releaseTime / 3));



    leadFundamentalOsc.connect(leadFundamentalOscGain).connect(bpFilterNodeLead).connect(convolutionDistortion1).connect(tremGain).connect(plateReverb3).connect(leadGain).connect(audioContext.destination);
    
    // ROUTING

    // leadOvertoneOneOsc.connect(leadOvertoneOneGain)
    // leadOvertoneTwoOsc.connect(leadOvertoneTwoGain)
    // leadOvertoneThreeOsc.connect(leadOvertoneThreeGain)
    // leadOvertoneFourOsc.connect(leadOvertoneFourGain)
    // leadOvertoneFiveOsc.connect(leadOvertoneFiveGain)

    // leadOvertoneOneGain.connect(leadFundamentalOscGain)
    // leadOvertoneTwoGain.connect(leadFundamentalOscGain)
    // leadOvertoneThreeGain.connect(leadFundamentalOscGain)
    // leadOvertoneFourGain.connect(leadFundamentalOscGain)
    // leadOvertoneFiveGain.connect(leadFundamentalOscGain)

    // START STOP

    leadFundamentalOsc.start(time);
    leadFundamentalOsc.stop((time) + sweepLength);
    // leadOvertoneOneOsc.start(time);
    // leadOvertoneOneOsc.stop((time) + sweepLength * 2);
    // leadOvertoneTwoOsc.start(time);
    // leadOvertoneTwoOsc.stop((time) + sweepLength * 2);
    // leadOvertoneThreeOsc.start(time);
    // leadOvertoneThreeOsc.stop((time) + sweepLength * 2);
    // leadOvertoneFourOsc.start(time);
    // leadOvertoneFourOsc.stop((time) + sweepLength * 2);
    // leadOvertoneFiveOsc.start(time);
    // leadOvertoneFiveOsc.stop((time) + sweepLength * 2);


    // Advance notes
    
    if (noteIndex < notesLength - 1){
        noteIndex = noteIndex + 1
    } else {
        noteIndex = 0
    }
}



// ADDITIVE PAD

let fundamentalFrequency = 155.56


// PAD FILTER
const bpFilterNode = audioContext.createBiquadFilter();
bpFilterNode.type = 'bandpass'
// bpFilterNode.frequency.value = 250
bpFilterNode.Q.value = '150'
let bpFilterMin = 100
let bpFilterMax = 200
let bpFilterSpeed = 15
let padGain = audioContext.createGain();
// padGain.gain.value = 0.7

function playAdditivePad(time, oscType, fundamental){

    let fundamentalOsc = new OscillatorNode(audioContext, {
        frequency: fundamental,
        type: oscType,
    });
    let masterGain = audioContext.createGain();

    let overtoneOneOsc = new OscillatorNode(audioContext, {
        frequency: fundamental * 2,
        type: oscType,
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
    });
    let overtoneFiveGain = audioContext.createGain();

    let overtoneSixOsc= new OscillatorNode(audioContext, {
        frequency: fundamental * 7,
        type: oscType,
    });
    let overtoneSixGain = audioContext.createGain();

    let overtoneSevenOsc= new OscillatorNode(audioContext, {
        frequency: fundamental * 8,
        type: oscType,
    });
    let overtoneSevenGain = audioContext.createGain();

    let overtoneEightOsc= new OscillatorNode(audioContext, {
        frequency: fundamental * 9,
        type: oscType,
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

    // filterNode2.connect(judsonReverb).connect(plateReverb).connect(masterGain)
    
    masterGain.connect(bpFilterNode).connect(convolutionDistortion2).connect(judsonReverb2).connect(plateReverb2).connect(padGain).connect(audioContext.destination)

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


// LFO
const LFOFilterNode = audioContext.createBiquadFilter();
LFOFilterNode.type = 'lowpass'
LFOFilterNode.Q.value = '30'
let LfoFilterMin = 72
let LfoFilterMax = 90
let LfoFilterSpeed = 1


// REVERBS

async function createJudsonReverb() {
  let convolver = audioContext.createConvolver();

  // load impulse response from file
  let response = await fetch("./judsonMemorialChurch.wav");
  let arraybuffer = await response.arrayBuffer();
  convolver.buffer = await audioContext.decodeAudioData(arraybuffer);

  return convolver;
}
let judsonReverb1 = await createJudsonReverb();
let judsonReverb2 = await createJudsonReverb();
let judsonReverb3 = await createJudsonReverb();

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
let convolutionDistortion3 = await createConvolutionDistortion();

let droneAttackTime = 0.5
let droneReleaseTime = 5.0
function playDrone(time){
    const droneOsc = audioContext.createOscillator()
    droneOsc.type = 'triangle'
    droneOsc.frequency.value = '77.78'

    const sweepEnv = new GainNode(audioContext);
    sweepEnv.gain.cancelScheduledValues(time);
    sweepEnv.gain.setValueAtTime(0, time);
    sweepEnv.gain.linearRampToValueAtTime(1, (time) +droneAttackTime);
    sweepEnv.gain.linearRampToValueAtTime(0, (time) +(droneAttackTime + droneReleaseTime));



    droneOsc.connect(sweepEnv).connect(convolutionDistortion1).connect(LFOFilterNode).connect(judsonReverb1).connect(plateReverb1).connect(droneGain).connect(audioContext.destination)
    droneOsc.start(time)
    droneOsc.stop(time + (droneAttackTime + droneReleaseTime))
}

const droneGain = audioContext.createGain();

const droneGainControl = document.querySelector("#drone-volume");

droneGainControl.addEventListener("input", () => {
  droneGain.gain.value = droneGainControl.value;
  console.log(droneGain.gain.value)
});

const leadGainControl = document.querySelector("#lead-volume");

leadGainControl.addEventListener("input", () => {
  leadGain.gain.value = leadGainControl.value;
//   console.log(leadGain.gain.value)
});

const padGainControl = document.querySelector("#pad-volume");

padGainControl.addEventListener("input", () => {
  padGain.gain.value = padGainControl.value;
//   console.log(leadGain.gain.value)
});


// const playDroneButton = document.getElementById('play-drone-button')
// playDroneButton.addEventListener("click", ()=>{
//     // rewrite this as func
//     playDrone();
// });

// const playLeadButton = document.getElementById('play-lead-button')
// playLeadButton.addEventListener("click", ()=>{
//     console.log('i click')
//     playLeadOsc(clock.getElapsedTime(), noteSequence, noteIndex)
// });

// const playPadButton = document.getElementById('play-pad-button')
// playPadButton.addEventListener("click", ()=>{
//     console.log('i click')
//     playAdditivePad(clock.getElapsedTime(), "sine", 311.13)
//     playAdditivePad((clock.getElapsedTime()+.5), "sine", 392)
//     playAdditivePad((clock.getElapsedTime()+1), "sine", 587.33)
//     playAdditivePad((clock.getElapsedTime()+1.5), "sine", 466.16)
    
// });

// BPM AND SCHEDULING

let tempo = 60.0
let beatLengthSeconds = 0.0
let lastBeatTime = 0
let currentBeat = 1
let currentBar = 1
let totalBars = 2
function metronome(currentTime, tempo){
    
    const beatLengthSeconds = 60.0 / tempo;
    const eighthhNoteSeconds = beatLengthSeconds / 2;

    let deltaTimeSinceLastBeat = currentTime - lastBeatTime;
    
    if (deltaTimeSinceLastBeat >= eighthhNoteSeconds){
        lastBeatTime = currentTime;
        if (currentBeat < 4.5){
            currentBeat += .5;

        } else {
            currentBeat = 1
            if (currentBar < totalBars){
                currentBar += 1;
            } else {
                currentBar = 1;
            }
        }
    }; 

    return {'bar' : currentBar, 'beat': currentBeat, 'beatLength' : beatLengthSeconds}
};


// SEQUENCER

let leadSequence = [1, 2.5, 4.5]
let leadSequenceStep = 0
function leadSequencer(time, metronomeBeat, sequence) {

    let beat = metronomeBeat.beat
    
    if (sequence[leadSequenceStep] == beat){
        playLeadOsc(time, noteSequence, noteIndex)
        if (leadSequenceStep < sequence.length-1){
            leadSequenceStep ++
        } else {
            leadSequenceStep = 0
        }
    }
}

let droneSequence = [1]
let droneSequenceStep = 0
function droneSequencer(time, metronomeBeat, sequence) {

    let beat = metronomeBeat.beat
    
    if (sequence[droneSequenceStep] == beat){
        playDrone(time)
        if (droneSequenceStep < sequence.length-1){
            droneSequenceStep ++
        } else {
            droneSequenceStep = 0
        }
        
    }
}

let padSequence = [1, 4]
let padSequenceStep = 0
function padSequencer(time, metronomeBeat, sequence) {

    let beat = metronomeBeat.beat
    
    if (sequence[padSequenceStep] == beat){
            playAdditivePad(time, "sine", 311.13)
            playAdditivePad((time+.5), "sine", 392)
            playAdditivePad((time+1), "sine", 587.33)
            playAdditivePad((time+1.5), "sine", 466.16)
        if (padSequenceStep < sequence.length-1){
            padSequenceStep ++
        } else {
            padSequenceStep = 0
        }
        
    }
}






/**
 * Animate
 */

const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime();
    
    let metronomeTime = metronome(elapsedTime, 30);
    leadSequencer(elapsedTime, metronomeTime, leadSequence)
    let tremGainRange = .5
    let tremGainValue = (((Math.sin(elapsedTime * 40) + 1) * tremGainRange) / 2) + .5
    tremGain.gain.value = tremGainValue
    // console.log(tremGainValue)
    // let leadDetuneRange = 10
    // let leadDetuneValue = (((Math.sin(elapsedTime) + 1) * leadDetuneRange) / 2) + 1
    // osc.detune.value = leadDetuneValue
    
    droneSequencer(elapsedTime, metronomeTime, droneSequence)
    padSequencer(elapsedTime, metronomeTime, padSequence)
    // let padSequcene = sequencer(elapsedTime, metronomeTime, playLeadOsc, [1, 2])

    // DRONE FILTER SWEEP
    let sinRange = 2 // -1 to 1 is 2
    let filterRange = LfoFilterMax - LfoFilterMin // high and low points of filter sweep
    let newFilterSweepValue = (((Math.sin(elapsedTime * LfoFilterSpeed) - (-1)) * filterRange) / sinRange ) + LfoFilterMin
    LFOFilterNode.frequency.value = newFilterSweepValue

    // PAD FILTER SWEEP
    let sinRange2 = 2
    let bpFilterRange = bpFilterMax - bpFilterMin
    let newBpFilterSweepValue = (((Math.sin(elapsedTime * bpFilterSpeed) + 1) * bpFilterRange) / sinRange2) + bpFilterMin
    bpFilterNode.frequency.value = newBpFilterSweepValue

    // LEAD FILTER SWEEP
    let sinRange3 = 2
    let bpFilterRangeLead = bpFilterLeadMax - bpFilterLeadMin
    let newBpFilterLeadSweepValue = (((Math.sin(elapsedTime * bpFilterLeadSpeed) + 1) * bpFilterRangeLead) / sinRange3) + bpFilterLeadMin
    bpFilterNodeLead.frequency.value = newBpFilterLeadSweepValue

    // LEAD OSC
    


    
    sphereParticles.rotation.z = elapsedTime * rotationSpeed   
    waveLengthDiv.textContent = `${getWaveInfo(points, waveLength)}`;
    // let wavelengthNumber = getWaveInfo(points, waveLength)
    // console.log('textContent',waveLengthDiv.textContent)
    // console.log(Math.sin(elapsedTime))
    
    let innerRadius2 = (((Math.sin(elapsedTime * LfoFilterSpeed) - 4.9) * .2) / 2) + 4.9
    for (let i = 0; i <= points; i++){
        const t = ((i / (points)));
        
        const polarAngle = Math.acos((1 - 2 * t));
        const azimuth = goldenAngleRadians * i;

        // 
        let outerRadius = innerRadius2 + (Math.sin(((elapsedTime * speedOfWaves) + (i * waveLength)))) * amplitude // * 
        let i3 = i * 3
        
        positions[i3] = Math.sin(polarAngle) * Math.cos(azimuth) * (outerRadius);     // x
        positions[i3 + 1] = Math.sin(polarAngle) * Math.sin(azimuth) * (outerRadius); // y
        positions[i3 + 2] = Math.cos(polarAngle) * outerRadius ; // z

        // look into WHY z axis addition works and looks good
        
        // colors[i3] = 1.0 * (Math.sin(elapsedTime + positions[i3+2])) // r
        // colors[i3+1] = 1.0 * (Math.cos(elapsedTime +  positions[i3+2]))// g
        // colors[i3+2] = 1.0 * Math.sin((i) + (positions[i3 + 2]))// b
        
        colors[i3] = 1.0 * Math.abs(Math.sin(elapsedTime + positions[i3+2])) // + outerRadius
        colors[i3+1] = 1.0 * Math.cos(elapsedTime + positions[i3 + 2]) 
        //  adding outerRadius to r b or g creates cool color palettes. should figure out how to mix this variable into the colors
        colors[i3+2] = 1.0 * Math.sin((elapsedTime + positions[i3 + 2])) //  + positions[i3+2]

        // if (i3 % wavelengthNumber === 0){
        //     console.log('true')
        //     colors[i3] = 1.0 
        //     colors[i3+1] = 1.0 
        // //  adding outerRadius to r b or g creates cool color palettes. should figure out how to mix this variable into the colors
        //     colors[i3+2] = 1.0 
        // }
        // line
        if (guiParams.scopeOn == true ){
           
            linePositions[i3] = 0//x
            linePositions[i3 + 1] = ((Math.sin((elapsedTime * speedOfWaves) + (i * waveLength))))  * amplitude //y
            linePositions[i3+2] = i / 50 //z

            lineColor[i3] = 1.0
            lineColor[i3+1] = 1.0
            lineColor[i3+2] = 1.0
            if (!checkForChildName(scene, 'lineParticles')){
                scene.add(lineParticles)
            }

        } else if (guiParams.scopeOn == false && checkForChildName(scene, 'lineParticles')){
            // console.log('i worked')
            scene.remove(lineParticles)
        }

        
        
    
    }
   
    fibSphereGeometry.attributes.position.needsUpdate = true
    fibSphereGeometry.attributes.color.needsUpdate = true

    lineGeometry.attributes.position.needsUpdate = true
    lineGeometry.attributes.color.needsUpdate = true

   

    controls.update()
    // console.log(Math.sin(waveLength))
    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}


tick()





getWaveInfo(points, waveLength)

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