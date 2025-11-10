import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import { GodRaysCombineShader } from 'three/examples/jsm/Addons.js'

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const particleTexture = textureLoader.load('/textures/particles/9.png')

/**
 * MATERIALS
 */
// const particlesGeometry = new THREE.SphereGeometry(1,32,32)
const fibSphereGeometry = new THREE.BufferGeometry()
let points = 10000
const radius = 3 
const goldenRatio = (1 + Math.sqrt(5)) / 2;
console.log(goldenRatio)
// 
// const goldenAngleRadians = Math.PI * 2 * goldenRatio;
const goldenAngleRadians = Math.PI * 2 / (goldenRatio * goldenRatio)
console.log(goldenAngleRadians)
function radiansToDegrees(radians){
    return radians * (180/Math.PI)
}
console.log(radiansToDegrees(goldenAngleRadians))
function degreesToRadians(degrees){
    return degrees * (Math.PI/180)
}

console.log('ga deg',radiansToDegrees(goldenAngleRadians))
// for each point, we need 3 positions, so positions is 3x points. 
const positions = new Float32Array(points * 3) // each point requires xyz cordinates
const colors = new Float32Array(points * 3) // each point requires rbg values
let pointCount = 0

// incriment by number of points in sphere
for (let i = 0; i <= points; i++){
    
    // normalize scale from point 0 to last point to 0 through 1
    // this will be used to calculate polar angle, which uses arcosine to return an angle IN RADIANS from 0Pi to 2Pi
    const t = ((i / (points)));
    
   
    
    
    // Math.acos(1) = 0, when the ration of adj leg to hyp is 1/1
    // Math.acos(0) = Pi/2, when ratio of adj leg to hyp 0/1
    // Math.acos(-1) = Pi, when ratio of  adj leg to hyp is -1/1
    // as cosine moves from 1, to 0, to -1, acos moves from 0 to Pi
    // this Pi value is a radian (angle where arc length equals radius)
    // 0*r = angle 0, Pi/4*r = 45 deg, Pi/2*r = 90 deg, Pi*r = 180 deg, 2Pi*r = 360 deg
    
    // cosine takes an angle IN RADIANS, and returns the ratio of adjacent/hypotinuse
    // arccosine takes a ratio  adjacent/hypotenuse) and returns an angle IN RADIANS
    const polarAngle = Math.acos((1 - 2 * t));
    // console.log('pa',radiansToDegrees(polarAngle))
    // normalize from 1 to -1, the values that arccosine accepts
    // 1 - (2 * 0) = 1 (start)
    // 1 - (2*.5) = 0. (halfway)
    // 1 -(2*1) = -1 (finish)

    // sin and cos are always between 1 and -1, tan between neg infinity and infinity
    // RADIANS 0*r = angle 0, Pi/4*r = 45 deg, Pi/2*r = 90 deg, Pi*r = 180 deg, 2Pi*r = 360 deg
    // COS in degreees: cos(0) = 1, cos(90) = 0, cos(180) = -1

    // INVERSE COSINE
    // Math.acos is inverse cosine. Takes ratio, and returns RADIANS (only accepts values between -1 and 1)
    // Math.acos(1) = 0. When ratio of adj/hyp = 1 (1/1), angle is 0 deg|0 radians
    // Math.acos(0) = 1.57. When ratio of adj/hyp = 0 (0/1), angle is 90 deg|Pi/2 radians
    // Math.acos(-1) = Pi. When ratio of adj/hyp  = -1 (-1/1), angle is 180 deg|Pi radians

    // AZIMUTH is longitudinal rotation
    // azimuth wraps around the sphere many times
    // golden angle ensures that point in radial rotation is always placed in optimal position between closest two points
    const azimuth = goldenAngleRadians * i;
    console.log('az',radiansToDegrees(azimuth))

    
    // i*3 lets us set 3 valuses each iteration (x,y,z)
    let i3 = i * 3
    positions[i3] = Math.sin(polarAngle) * Math.cos(azimuth) * radius;     // x
    // console.log('x',Math.sin(polarAngle) * Math.cos(azimuth) * radius)
    positions[i3 + 1] = Math.sin(polarAngle) * Math.sin(azimuth) * radius; // y
    // console.log('y', Math.sin(polarAngle) * Math.sin(azimuth) * radius)
    positions[i3 + 2] = Math.cos(polarAngle) * radius; // z
    // console.log('z', Math.cos(polarAngle) * radius)
    
    colors[i3] = 1.0
    colors[i3 + 1] = 1.0
    colors[i3 + 2] = 1.0
}
console.log(pointCount)
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
    size : 0.1,
    sizeAttenuation: true
})
// particlesMaterial.color = new THREE.Color('lightgreen')
particlesMaterial.transparent = true
particlesMaterial.alphaMap = particleTexture
particlesMaterial.depthWrite = false
particlesMaterial.vertexColors = true


// Points
// same as mesh, geometry and material
const particles = new THREE.Points(fibSphereGeometry , particlesMaterial)
scene.add(particles)

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

/**
 * Animate
 */
const clock = new THREE.Clock()
// console.log(randomGeometry.attributes.position.array)
const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    // count += 1

    // for (let i = 0; i < count * 3; i++){
        
        
    //     // t is i/count, which is a number that incriments from 0 to 3 (since i ends at count*3)
    //     const t = i / count;
        
    //     const inclination = Math.acos(1 - 2 * t);
    //     const azimuth = goldenAngle * i;

        
    //     positions[i * 3] = Math.sin(inclination) * Math.cos(azimuth) * radius;     // x
    //     positions[i * 3 + 1] = Math.sin(inclination) * Math.sin(azimuth) * radius; // y
    //     positions[i * 3 + 2] = Math.cos(inclination) * radius; // z
    //     // console.log(colors[i])
    //     colors[i] = Math.random()
        
    // }
    // console.log(count)
    // console.log(elapsedTime)
    // particles.rotation.y = elapsedTime * 0.1

    // for(let i = 0; i < count; i++){
    //     // const i3 = i * 3
    //     // const x = randomGeometry.attributes.position.array[i3]
    //     // const z = randomGeometry.attributes.position.array[i3+2]
    //     // // randomGeometry.attributes.position.array[i3 + 1] = randomGeometry.attributes.position.array[i3 + 1] + Math.sin(elapsedTime + x) / 100
    //     // randomGeometry.attributes.position.array[i3 + 2] = randomGeometry.attributes.position.array[i3 + 2] + Math.cos(elapsedTime + x) / 100
    //     // let newCount = count * Math.sin(elapsedTime)
    //     const t = i / count;
    //     const inclination = Math.acos(1 - 2 * t);
    //     const azimuth = angleIncrement * i;
    //     // positions[i * 3] = (Math.sin(inclination) * Math.cos(azimuth) * radius ) * (Math.sin(elapsedTime)/2);     // x
    //     // positions[i * 3 + 1] = (Math.sin(inclination) * Math.sin(azimuth) * radius) * (Math.sin(elapsedTime)/2); // y
    //     // positions[i * 3 + 2] = (Math.cos(inclination) * radius) * (Math.sin(elapsedTime)/2); 
    // }
    // console.log(randomGeometry.attributes)
    // fibSphereGeometry.attributes.position.needsUpdate = true
    // randomGeometry.attributes = true
    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()