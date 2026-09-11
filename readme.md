## UNNAMED SPHERE GENERATIVE MUSIC VISUALIZEER
This ongoing projects uses three.js particles, p5.js, and the web audio API to create an interactive, generative, music visualizer. 

The core of the visualization is a fibonacci sphere rendered out of particles. While incrimenting the polar angle from top to bottom, each particle is placed one golden angle rotation from the last. This creates an even distribution of points on the sphere, and also results in a vizually satisfying spiral pattern that you may recognize in the distribution of seeds on a Sunflower, or the shape of a Nautilus shell. Special thanks to Jim Bumgardner (AKA Krazydad) for his help with the project, especially his sine wave rainbow tutorial (https://krazydad.com/tutorials/makecolors.php). Check out his work! 

By modulating the 'wavelength slider,' you can controls the spacing of the peaks and valleys of a sine wave that is sent from point 0 (at the top), to point n (at the bottom). Differnet wavelengths reveal differnet patterns on the sphere. 

The circle UI was inspired by Godfried Toussaint's 'The Geometry of Musical Rhythm,' which was given to me by Steven Zemanian. Steven also helped me understand additive synthesis, which I used to make the pad and bass patches sound rich and satisfying. Select the number of pulses you want in each loop by clicking the input below the circle UI, and then click on the dots to turn on/off notes. Endless polyrhythms will be created by combining different lengths of loops! 

This is a WIP and I intend on adding to this project over time, as well as fixing any bugs you might encounter. I'm already running into performace issues when testing it on multiple machines. If the FPS (top left corner), is consistantly below 60, please let me know and give me details about your computer, screen size, and pixel resolution. This project is not optimized for phones or tablets, but I would be curious to see how they handle it. 

The intention for this project is to provide anyone with internet access with a calming environment. In my view, the internet has gone from a place of discovery, wonder, and human connection, to a space of advertising (yuck), divisive content, and the siloing of individuals from their communities, both physically and ideologically. Inspired by the ideas of permacomputing (https://nyc.permacomputing.net/), I am seeking to take back a small space of the internet from the culturually polluted landscape that has resulted from Capital's invasion of the digital commons. Think of it as a small garden to relax in admidst a sea of mostrous factories spewing negative psycic energy. 

I hope you enjoy my project, and I would love to hear from you. 

-Ben 

## Setup
Download [Node.js](https://nodejs.org/en/download/).
Run this followed commands:

``` bash
# Install dependencies (only the first time)
npm install

# Run the local server at localhost:8080
npm run dev


