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
const lineGeometry = new THREE.BufferGeometry()

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


function checkForChildName(scene, name){
    let childPresent = false
    scene.children.map((child)=>{
        if (child['name'] == name){
            childPresent = true
        } 
    })
    return childPresent
}


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
const tremGain = new GainNode(audioContext)
const leadPan = audioContext.createStereoPanner()

leadPan.pan.value = -.3

function playLeadOsc(time, wave, attackTime, releaseTime, noteSequence, currentNoteIndex) {
    const notesLength = noteSequence.length
    const sweepLength = attackTime + releaseTime

    const leadFundamentalOsc = new OscillatorNode(audioContext, {
        frequency: noteSequence[currentNoteIndex],
        type: wave,
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

    // Advance notes
    if (leadNoteIndex< notesLength - 1){
        leadNoteIndex = leadNoteIndex + 1
    } else {
        leadNoteIndex = 0
    }
}

// ADDITIVE PAD

// PAD FILTER
const bpFilterNodePad = createFilterNode('bandpass', '150')

let padGain = audioContext.createGain();

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

const droneLfoFilterNode = createFilterNode('bandpass', '1')

const droneGain = audioContext.createGain();

const dronePan = audioContext.createStereoPanner()

function playDrone(time, wave, freqency, attack, release){

    // fundamental osc goes straight to sweepEnvGain envelope
    // sub osc and 5th osc are attenuated before linking to sweepEnvGain

    const droneOscFundamental = audioContext.createOscillator()
    droneOscFundamental.type = wave
    droneOscFundamental.frequency.value = freqency
    

    const droneOscSub = audioContext.createOscillator()
    droneOscSub.type = wave
    droneOscSub.frequency.value = freqency / 2
    const droneOscSubGain = audioContext.createGain()
    droneOscSubGain.gain.value = 0.1

    const droneOsc5th = audioContext.createOscillator()
    droneOsc5th.type = wave
    droneOsc5th.frequency.value = freqency * 2
    const droneOsc5thGain = audioContext.createGain()
    droneOsc5thGain.gain.value = 0.01


    const sweepEnvGain = new GainNode(audioContext);
    sweepEnvGain.gain.cancelScheduledValues(time);
    sweepEnvGain.gain.setValueAtTime(0, time);
    sweepEnvGain.gain.linearRampToValueAtTime(1, (time) + attack);
    sweepEnvGain.gain.linearRampToValueAtTime(0, (time) +(attack + release));

    // create sub osc and fifth above fundamental and link to chain at lower volumes

    droneOsc5th.connect(droneOsc5thGain)
    droneOscSub.connect(droneOscSubGain)

    droneOsc5thGain.connect(sweepEnvGain)
    droneOscSubGain.connect(sweepEnvGain)

    droneOscFundamental.connect(sweepEnvGain)


    sweepEnvGain.connect(droneLfoFilterNode).connect(convolutionDistortion2).connect(dronePan).connect(plateReverb3).connect(droneGain).connect(audioContext.destination)
    droneOscFundamental.start(time)
    droneOscFundamental.stop(time + (attack + release))

    droneOsc5th.start(time)
    droneOsc5th.stop(time + (attack + release))

    droneOscSub.start(time)
    droneOscSub.stop(time + (attack + release))
}

const droneGainControl = document.querySelector("#drone-volume");

droneGainControl.addEventListener("input", () => {
  droneGain.gain.value = droneGainControl.value;
  console.log(droneGain.gain.value)
});

const leadGainControl = document.querySelector("#lead-volume");

leadGainControl.addEventListener("input", () => {
  leadGain.gain.value = leadGainControl.value;
});

const padGainControl = document.querySelector("#pad-volume");

padGainControl.addEventListener("input", () => {
  padGain.gain.value = padGainControl.value;
});

// SEQUENCER

// how do I make lead Note Sequence sound good at many lengths?
const leadNoteSequence = [783.99, 622.25, 932.35, 587.33, 1174.66, 783.99, 622.25, 932.35, 587.33]
let leadNoteIndex = 0
let leadPulseBooleanArray = [true, false, false, true, false, false, true, false]
let lastPlayedBeat = null
// make this work for all instruments by taking diff args
function leadSequencerBooleanArray (time, metronomeBeat, pulseArray){
    // beat is music time starting at one
    // but array starts at 0
    let currentBeat = metronomeBeat - 1

    for (let i = 0; i < pulseArray.length; i++){
        let currentSequenceOnsetBoolean = pulseArray[i]
        let currentSequenceOnset = i
        // bug occurs when sequence only has length of 1 because lastPlayed beat is same as currentBeat
        // not sure how to fix this just yet
        if (currentSequenceOnsetBoolean == true && currentSequenceOnset === currentBeat && lastPlayedBeat !== currentBeat){
            // leadNoteIndex is advanced withing playLeadOsc()
            playLeadOsc(time, 'triangle', 0.1, 1, leadNoteSequence, leadNoteIndex)
            // this should prevent osc from playiing multiple times per beat
            lastPlayedBeat = currentBeat
            // lead start time array is for animation
            leadStartTimeArray.push(time)
        } 
    } 

}


let droneSequence = [1, 5]
let droneSequenceStep = 0
function droneSequencer(time, metronomeBeat, sequence) {

    let beat = metronomeBeat
    
    if (sequence[droneSequenceStep] == beat){
        playDrone(time, 'sine', '77.78', 2.0, 12.0)
        if (droneSequenceStep < sequence.length-1){
            droneSequenceStep ++
        } else {
            droneSequenceStep = 0
        }
    }
}


let padSequence = [1, 4, 5 , 8]
let padSequenceStep = 0
function padSequencer(time, metronomeBeat, sequence) {
    
    let beat = metronomeBeat
    
    
    if (sequence[padSequenceStep] == beat){
            playAdditivePad(time, "sine", 311.13)
            playAdditivePad((time+.5), "sine", 392)
            playAdditivePad((time+1), "sine", 587.33)
            playAdditivePad((time+1.5), "sine", 466.16)
            // add padTrigTime to array
            padStartTimeArray.push(time)
        if (padSequenceStep < sequence.length-1){
            padSequenceStep ++
        } else {
            padSequenceStep = 0
        }
    } 
}

// METRONOME

let bpm = 20;
let lastPulseTime = 0;
let startTime = 0
let currentPulse = 1;
let beatLengthSeconds = null
let totalLoopTime = null
let timeWithinLoopSeconds= null
// METRONOME SHOULD RETURN BOTH BEATS AND TIME COMPLETED OF LOOP

function metronome(currentTime, pulseBooleanArrayLength, bpm){
    
    beatLengthSeconds = 60.0 / bpm;
    totalLoopTime = beatLengthSeconds * pulseBooleanArrayLength

    // GEMINI's Metronome (modulo method to wrap with floor division to count)

    let deltaSinceStart = currentTime - startTime
    // mod operator restarts timeWithinLoopSeconds at 0 whenever deltaSinceStart(or a multiple of deltaSinceStart that is divisible by TotalLoopTime) excedes totalLoopTime 
    // this counts up to total loop time, then resets to zero when it goes over, repeating indefinetily 
    timeWithinLoopSeconds = (deltaSinceStart) % totalLoopTime
    
    // timeWithinLoopSeconds is counting up to totalLoopTime then wraps back to 0 after
    // lets say timeWithinLoopSeconds is 1.5, and beatLenghSeconds is 3. This would equal .5, rounded down 0. 
    // any time value less than one beat lenght will be rounded to zero, and any over a beat length will be rounded to the lower beat 
    // add one to go from zero index to music convention of starting at 1
    let newPulse = Math.floor(timeWithinLoopSeconds / beatLengthSeconds) + 1

    // only rewrite currentPulse global var if the newPulse is not the same as currentPulse
    // this appears to keep metronome in sync with pulse changes
    if (newPulse !== currentPulse) {
        currentPulse = newPulse;
        lastPulseTime = currentTime;
    }
    return currentPulse
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

// ANIMATIONS

// global vars for pad

let padStartTimeArray = []
const padAnimationLength = 9

let leadStartTimeArray = []
const leadAnimationLength = 3.5 // 1 sec and some reverb

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
    const radiusAdditionAmmount = .1
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
    
    globalElapsedTime = elapsedTime

    stats.update()
    // put leadConfig.pulses into numberof pulses arg
    // will later need a differnet metronome for each instrument
    let metronomeTime = metronome(elapsedTime, leadPulseBooleanArray.length, bpm);

    globalMetronomeTime = metronomeTime
    // console.log('ls',leadOnsetSequence)
    // should this take global vars as args? does that do anything differently? 
    // leadSequencer(elapsedTime, metronomeTime, leadOnsetSequence)
    leadSequencerBooleanArray(elapsedTime, metronomeTime, leadPulseBooleanArray)
    // console.log(leadPulseBooleanArray, metronomeTime)
    tremGain.gain.value = lfoValue(.5, 1.5, 40, elapsedTime)
 
    droneSequencer(elapsedTime, metronomeTime, droneSequence)
    dronePan.pan.value = Math.sin(elapsedTime) / 6

    padSequencer(elapsedTime, metronomeTime, padSequence)
    
    // console.log(saturationLevel)

    // DRONE FILTER SWEEP
    droneLfoFilterNode.frequency.value = lfoValue(39, 156, .5, elapsedTime)
    // console.log(droneLfoFilterNode.frequency.value)
    // PAD FILTER SWEEP
    bpFilterNodePad.frequency.value = lfoValue(100, 200, 15, elapsedTime)

    // LEAD FILTER SWEEP
    bpFilterNodeLead.frequency.value = lfoValue(500, 1500, 10, elapsedTime)

    

    // LEAD OSC
    sphereParticles.rotation.z = elapsedTime * rotationSpeed   
  
    
    // ANIMATIONS 
    // LEAD ANIMATIONS
    
    // console.log(leadStartTimeArray)


    // PAD ANIMATIONS
    removeStartTimesOfCompletedAnimations(elapsedTime, padStartTimeArray, padAnimationLength)
    let summedAnimationValues = sumAllAnimationValues(elapsedTime, padStartTimeArray, padAnimationLength)
    let clampedAnimationValuesSum = MathUtils.clamp(summedAnimationValues, 0 ,100)

    // change fib spiral pattern with pad play
    // could use non clamped vals but would need to know
    waveLength = mapV(clampedAnimationValuesSum, 1 , 100 , waveLength, waveLength + .00000005)
    
    // THIS COULD LOOK BETTER!!!
    const colorCenter = .55
    let saturationChange = mapV(clampedAnimationValuesSum, 1, 100, 0, .07)
    let newColorCenter = colorCenter - saturationChange
    let newColorAmplitude = 1.0 - newColorCenter
    
    // What if i didn't clamp and set max to animation completion * 2?
    let newAmplitude = amplitude + easeInOutSine(mapV(clampedAnimationValuesSum, 0, 100, 0 , .15))

    
    // DRONE ANIMATION
    let innerRadius2 = mapV(droneLfoFilterNode.frequency.value, 39, 156, 5, 5.5)
    // LEAD ANIMATION
    // band animates from start of innerRadius to 
    
    let lowerBound = (innerRadius2 - newAmplitude) 
    let upperBound = (innerRadius2 + newAmplitude) 
    
    let leadAnimationPercentCompleteArray = createLeadAnimationPercentCompleteArray(elapsedTime, leadStartTimeArray, leadAnimationLength)
    let positionBetweenBoundsArray = createPositionBetweenBoundsArray(leadAnimationPercentCompleteArray, lowerBound, upperBound)

   

    removeStartTimesOfCompletedAnimations(elapsedTime,leadStartTimeArray,leadAnimationLength)

    for (let i = 0; i <= points; i++){
        const t = ((i / (points)));
        
        const polarAngle = Math.acos((1 - 2 * t));
        const azimuth = goldenAngleRadians * i;
        
        // is there a better name for this variable? Total Radius?
        let outerRadius = innerRadius2 + ((Math.sin(((elapsedTime * speedOfWaves) + (i * waveLength)))) * newAmplitude)
        // how do I send a pulse down the sine wave that multiplies outer radius?


        // three value chunk for xyz or rgb values
        let i3 = i * 3
        
        // spherical to cartesian 
        positions[i3] = Math.sin(polarAngle) * Math.cos(azimuth) * (outerRadius);     // x
        positions[i3 + 1] = Math.sin(polarAngle) * Math.sin(azimuth) * (outerRadius); // y
        positions[i3 + 2] = Math.cos(polarAngle) * (outerRadius) ; // z


        // RGB
        // color appears white when all rgb values are equal
        // rgb values are between 0 and 1 
        

        const zPosition = positions[i3 + 2]
        colors[i3] = ((Math.sin(elapsedTime + zPosition)*newColorAmplitude) + newColorCenter)// r
        colors[i3+ 1] = ((Math.sin((elapsedTime + zPosition)+2)*newColorAmplitude) + newColorCenter)// g
        colors[i3+2] = ((Math.sin((elapsedTime + zPosition)+4)*newColorAmplitude) + newColorCenter) // b

        changeColorOfParticlesWithinBandwidth(positionBetweenBoundsArray, outerRadius, i3, 1)
        easeInOutSine(changePositionParticlesWithinBandwidth(positionBetweenBoundsArray, polarAngle, azimuth, outerRadius, i3, 1))
        
        // SCOPE
        if (guiParams.scopeOn == true ){
           
            linePositions[i3] = 0//x
            linePositions[i3 + 1] = ((Math.sin((elapsedTime * speedOfWaves) + (i * waveLength))))  * amplitude //y
            linePositions[i3+2] = i / 50 //z

            const zPosition = positions[i3 + 2]
            lineColor[i3] = ((Math.sin(elapsedTime + zPosition)+1) / 2) // r
            lineColor[i3+1] = ((Math.sin((elapsedTime + zPosition)+2)+1) / 2) // g
            lineColor[i3+2] = ((Math.sin((elapsedTime + zPosition)+4)+1) / 2) // b
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
const leadPulsesInput = document.getElementById('lead-pulses-input');
leadPulsesInput.addEventListener('input', function () {
    let numberOfPulses = this.value
    // study this
    // remainder of time after elpased time is divided by beats
    // returns the position of remainder of time after a beat, before the next beat starts
    let timeIntoCurrentBeat = (globalElapsedTime ) % (60 / bpm);
    
    // MY ARRAY CHANGE
    let leadPulseBooleanArrayCopy = [...leadPulseBooleanArray]

    if(numberOfPulses < leadPulseBooleanArrayCopy.length){
        leadPulseBooleanArrayCopy.length = numberOfPulses
    } else {
        while(leadPulseBooleanArrayCopy.length < numberOfPulses){
            leadPulseBooleanArrayCopy.push(false)
        }
    }
    leadPulseBooleanArray = leadPulseBooleanArrayCopy

    // GEMINI startTime change
    // STUDY THIS 
    // remove one pulse, 
    startTime = globalElapsedTime - ((currentPulse - 1) * (60 / bpm)) - timeIntoCurrentBeat;
    if (currentPulse > leadPulseBooleanArray.length){
        currentPulse = leadPulseBooleanArray.length -1
    }
})

// THIS IS THE ANIMATED UI
// 4- repeat for all instruments

function creatCircleNotation (){
    // console.log('lpiv func',leadPulsesInputValue)
    const circleNotation= (sketch) => {

        let canvasHeight = 200
        let canvasWidth = 200
        let originX = canvasWidth / 2
        let originY = canvasHeight / 2
        let circleDiameter = canvasHeight - 70
        let dotDiameter = 15
        let circleRadius = circleDiameter / 2
       
        // DOT/ONSET SELECT CLIC
        sketch.mouseClicked = () => {
                for(let i = 0; i < leadPulseBooleanArray.length; i++){
                    let currentPulse = i
                    const angle = (currentPulse / leadPulseBooleanArray.length) * (Math.PI * 2) - Math.PI / 2;
                    const dotX = originX + Math.cos(angle) * circleRadius;
                    const dotY = originY + Math.sin(angle) * circleRadius;
                    const dist = euclidianDistance(dotX, dotY, sketch.mouseX, sketch.mouseY);
                    // sense click on dot
                    if (dist < dotDiameter / 2){
                        // click on empty dot to turn pulse into onset
                        if (leadPulseBooleanArray[currentPulse] == false){
                            leadPulseBooleanArray[currentPulse] = true
                        // click on filled dot (onset) to turn back into pulse (empty)
                        } else {
                            leadPulseBooleanArray[currentPulse] = false
                        }
                    };
                };
            };       
        
        
        sketch.setup = () => {
                const container = document.getElementById('controls');
                sketch.createCanvas(canvasHeight, canvasWidth).parent(container);
            };

        
        sketch.draw = () => {
     
            // CIRCLE 
            sketch.clear();
            sketch.noFill();
            sketch.stroke(255);
            sketch.strokeWeight(3);
            sketch.circle(originX, originY, circleDiameter);

            //DOTS FOR PULSES
            
            // numberofPulsesLead needs to change for other instruments
            let numberOfPulses = leadPulseBooleanArray.length
            for(let i = 0; i < leadPulseBooleanArray.length; i++){
                let currentPulse = i
                const angle = (currentPulse / numberOfPulses) * (Math.PI * 2) - Math.PI / 2
                const dotX = originX + Math.cos(angle) * circleRadius
                const dotY = originY + Math.sin(angle) * circleRadius

                const extraDistForText = 18
                const textX = originX + Math.cos(angle) * (circleRadius + extraDistForText)
                const textY = originY + Math.sin(angle) * (circleRadius + extraDistForText)

                
                // if circle selected, fill circle
                // im slightly confused as to why this works
                if (leadPulseBooleanArray[currentPulse] == true){
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
            let loopPositionAngleRadians = mapV(timeWithinLoopSeconds, 0, totalLoopTime, 0 , (2 * Math.PI)) - Math.PI / 2
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
let circleNotationOne = creatCircleNotation()



let myp5 = new p5(circleNotationOne);



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