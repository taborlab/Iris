#The Light Program Interface (LPI)

A web application designed to enable easy programming and creation of Light Program Files (LPFs) for use in [Tabor Lab](http://taborlab.rice.edu/) optogenetic hardware.
It uses HTML5 and JavaScript to acquire desired light function parameters, perform intensity & time-shifting calculations, and finally
deliver output files to the user, all in the browser.

## Introduction

The Light Program Interface is designed to be a flexible interface for the [Tabor Lab](http://taborlab.rice.edu/) standardized optogenetic hardware platform. It is designed to:

1. Program optogenetic time courses in the hardware by compiling the desired Light Program File for a particular device,
2. Help with optogenetic program design and debugging with a full hardware (LED) simulation display,
3. Serve as an experimental support utility by creating files documenting a particular experiment's well randomization positions, light intensity time course, etc., in a CSV file,
4. Create a convenient record of previous optogenetic experiments by generating an LPI file that can be later used to reload a particular light program in the LPI.

Note that for advanced users, there is also a standalone Python script that can convert more complex and arbitrary light programs into device-readable LPF files; however the LPI should be sufficient for all normal use cases.

## Getting Started

### 1. **Select an optogenetic device from the dropdown menu**  
A variety of devices are supported in addition to those detailed in our publication, though the most common selection will be the 24-well plate device (LPA). This will automatically configure the LPI to have the correct number of wells and correct LED wavelengths for simulation later. If you have a custom device running LPI firmware, then you can use the `Custom Configuration`, which will prompt you to enter the number of rows and columns in your custom device, as well as the number of LEDs in each well and their wavelengths in the section that appears.

### 2. **Enter global experimental parameters**  
Some parameters apply to the entire experiment, such as the total experiment time length (in minutes), whether the well positions should be randomized, and whether the LEDs should all be turned off at the end of the experiment (check boxes). The `Experiment Length` should include all phases of the experiment, including any dark or preconditioning phases, which will be specified later. If you choose to randomize the well positions (highly recommended), you will be provided with the generated randomization matrix when you download the LPF so that you can descramble the data during analysis. We recommend turning off the LEDs at the end of the experiment, since this serves as a convenient indicator that the program has run its complete course.

### 3. **Add a New Experiment using the button**  
Experiments define groups of wells in the plate device that are related, typically because they are all timepoints/measurements of the same dynamic experiment (i.e. all wells are receiving time-shifted versions of the same input signal). An experiment can utilize any number of wells in the plate, and the number used by a particular experiment will automatically be updated as inputs are entered.

#### *Timepoints*  
In a dynamic experiment, the LPI can automatically generate a set of evenly-spaced timepoints or use a custom set (perhaps to focus data on early-time responses). For generated timepoints, enter the number of desired time points and the delay (in minutes) until the first time point, if any. For custom timepoints, click `Input Timepoints` and simply paste a list of timepoints into the array (all units in minutes). **Steady-state experiments should use the default value of 1 for the number of timepoints.**

#### *Replicates*  
Enter the number of experimental replicates of this experiment. The number of wells specified by the Experiment's Waveform inputs will be replicated accross the plate `Replicates` number of times (i.e. `Replicates = 1` indicates that *no additional* wells will be used). Note that this will very quickly use up available wells.

### 4. **Add Waveforms to the Experiment**  
The four icons represent the four fundamental waveform inputs programmed into the LPI: constant, step change, sinusoid, and arbitrary, which can be added to the Experiment by clicking the corresponding icons. Each Waveform represents a light input applied to the desired wells in a particular LED wavelength. Importantly, **waveforms cannot be composed** - that is, multiple waveforms cannot be applied to the same LED in the same well. More complex inputs (e.g. a series of step inputs) should be entered using the (more efficient) Arbitrary Waveform.  
Note that all light intensities (amplitudes) are given in hardware greyscale units (GS). Also note that if multiple intensities are given to the Constant or Step Waveforms, **each intensity will be separately applied to every other waveform in the experiment**, since multiple intensities of a single LED cannot be applied to the same well. In other words, every possible combination of amplitudes is used. For example, if 2 intensities are entered in a Step Waveform (e.g. 1000GS & 2000GS), and the Experiment specifies 10 samples ("time points") and 1 replicate, the Experiment will use 20 wells in the plate.

#### *Constant Waveform*
$$f(t) = c$$  
Constant inputs are used to apply competing amounts of deactivating light and to measure the steady-state response function. Obviously, they only have a single input parameter.

#### *Step Waveform*
$$f(t) = a * H(t-\tau) + c$$  
Step inputs (Heaviside step; $H(t)$)are used for dynamic characterization and have 3 parameters:

  * **Amplitude ($a$)**: the size of the step change, in GS units. *Note that step amplitudes can be negative!*
  * **Step offset ($c$)**: the vertical offset of the step function in GS units (constant addition accross all time points)
  * **Time shift ($\tau$)**: the amount of time (min) after the beginning of the experiment that the step should happen.  
  **Note:** this is different from the Experiment parameter regarding the delay until the first time point! This is specifying a change in the light input for this waveform; the delay until the first time point is specifying a change in the time-shifting for all wells in the Experiment.

#### *Sine Waveform*
$$f(t) = a * \sin \left(\frac{2*\pi \left(t - \phi\right)}{T}\right) + c$$  
Sinusoidal inputs are an alternative input signal for dynamic characterization and have 4 parameters:

  * **Amplitude ($a$)**: The amplitude of the sine (half the peak-to-peak amplitude) in GS units
  * **Period ($T$)**: The period of the wave, in minutes; the inverse of the wave frequency
  * **Phase ($\phi$)**: The phase shift of the wave, in minutes
  * **Offset ($c$)**: The vertical offset of the wave, in GS units

#### *Arbitrary Waveform*
$$f(t) = \sum_{i=0}^n a_i H(t-\tau_i)$$  
Arbitrary Waveforms allow input of any more complex function as a series of light intensities ($a_i$) and corresponding times at which the LED will switch to that intensity ($\tau_i$). These are entered as a list of values in the Excel-like table under their respsective headings. The switch times are the time since the beginning of the experiment (not related to timepoints), in minutes. The light intensities are in greayscale (GS) units. Because the smallest time resolution for the resulting LPF file is 1 sec, this is also the smallest valid time step for arbitrary inputs. 

### 5. Assess & debug the input waveform set
Once the desired set of waveforms has been entered, check their accuracy using the Experiment View popup, which will plot the given waveforms for each LED as functions of time and display the locations of the specified timepoints. This is an opportunity to visualize the relationship between the waveforms as specified and the timepoints that will be acquired in the experiment. Note that Plate View and Well View will (detailed below) will show a hardware simulation of the LED intensities, meaning almost all wells will be Time Shifted, based on which timepoint a particular well represents. Experiment View, in contrast, shows your timepoints as they relate to the overall optogenetic input signal. *In other words, Experiment View represents the view you  would plot during analysis.*

### 6. Load & assess the hardware simulation
Once satisfied with the settings for each Experiment, load the hardware simulation by clicking `Load New Simulation`. This will first validate all the inputs to make sure they are valid for the selected device, and second will display a hardware simulation in the right hand panel.

The default view is **Plate View**, which shows an overview of the entire plate device. Usign the dropdown in the navigation bar at the top, you can switch the display from showing all (illuminated) LEDs to only particular LEDs. Clicking on a well in the plate visualization will select that well, updating the position and well number in the nav bar. The up, down, left, and right arrow keys can also be used to change the selected well. Clicking the play button will begin the hardware simulation, and will show the response of the plate device to the generated light program. The Speed slider bar will decrease or increase the simulation playback speed.

To get more detail about a particular well, simply click the well in Plate View and then click `Well View` in the nav bar. **Well View** plots the LED intensity for all LEDs in a well as a function of time. Click and drag horizontally in the plot area to zoom in on that region of the plot. Notice that, again, the smallest time resolution for the program is 1 sec, which will cause some apparent aliasing at small timescales. To remove the plot for an LED, simply click its entry in the legend. A floating tooltip indicates the LED intensities corresponding to the time currently under the mouse curser. The arrow keys will still change the selected well and can be used to rapidly move through adjacent wells' Well Views. 

### 7. Download LPF, randomization CSV, and LPI file  
If everything looks good, then you can initiate the download of the generated files by clicking the `Download` button at the bottom of the inputs. The zipped folder includes the following files:

  * **program.lpf**  
  This is the hardware-readable Light Program File that will be loaded onto an SD card, which will then be processed by the plate hardware into LED intensities. Its file structure is detailed below, but is basically a binary composed of a short header and a series of intensities at each time point in the experiment.
  * **randomizationMatrix.csv**  
  This CSV contains all the information necessary for analysis after the experiment is completed:
    * **Program [Well] Index**: List of well numbers, top to bottom, left to right
    * **True Well Location**: Also known as the randomization matrix; randomized positions of the corresponding wells in the Well Index column. See below for the correct de-randomization algorithm.
    * **Time Points**: Since each well corresponds to a time-shifted timepoint in a dynamic run, these are listed here. Steady state programs (i.e. wells with only constant waveforms) will use the total Program Duration.
  * **savefile.lpi**  
  This file represents a complete image of the exact LPI session (including all inputs) used to generate the LPF file. This file can be used to reload the LPI session at a later date. Its primary function is to enable modification of a previous light program for future experiments and as a record for exactly what the corresponding LPF encodes. Note: This file does NOT contain the randomization matrix, and future (additional) LPF files created by uploading this to the LPI will not use the same randomization.

#### IMPORTANT
It is crucial that these files not get separated from each other. **Without an LPI file, it is impossible (using the LPI) to determine what program a particular LPF file encodes, and the hardware does not allow this file to be renamed!** That said, it is possible to parse LPF files using scripts (similar to the standalone Python LPF generator.) Instead, however, we recommend simply keeping these files together and loading up an LPI file to reload exactly the LPI session that produced the corresponding LPF.

Furthermore, loss of the randomization matrix will make the data impossible to analyze. **There is no way to extract the randomization martix from the LPI session savefile nor the LPF program.**

## Detailed Nuts and Bolts
### De-randomization Procedure
In plain language, the *values* in the Randomization Matrix (RM) are the *true positions* in the plate of the data for a particular well. For example, if the first value (index 0) in the RM is `16`, then the true data for the first well is in the well with index 16 (well number 17). *Be careful not to do this backwards!*

Some example Python code to perform this de-randomization:

```
    rand_mat = [4, 0, 1, 3, 2] # Example Randomization Matrix
    measured_data = [234, 345, 567, 456, 123] # Toy measured data for wells: 0, 1, 2, 3, 4
    descrambled_data = [0, 0, 0, 0, 0] # Empty; will hold the descrambled data values
    total_well_num = 5
    for i in range(total_well_num):
        descrambled_data[i] = measured_data[rand_mat[i]]
    print descrambled_data
    ## Prints:
    ## [123, 234, 345, 456, 567]
```

### The Time-Shifting Algorithm
In order to measure dynamics, 

```
![Time shifting diagram](Doc_TimeShifted_Inputs_small.png "Schematic of how wells experience a shifted input signal to measure dynamics.")
```

### LPF File Specifications
LPF file has a particular header, all encoded by 32-bit (4-byte) ints:

* byte 0-3: LPF version number (FILE_VERSION)
* bytes 4-7: number of channels (NUMBER_CHANNELS) **Note:** This is the total number of channels, not per well
* bytes 8-11: time step size, in ms (STEP_SIZE)
* bytes 12-15: number of time points (NUMBER_STEPS)
* bytes >=16: intensity values of each channel per timepoint
* for each value, two bytes will be used as a long 16-bit int.
	
Because of the above structure, specifically that every time step is encoded explicitly, and that each is encoded
using a 16-bit (2 byte) integer, there is a fair amount of overhead for each file.
**To keep things reasonable, we will have to limit time steps to 1 sec.**



### The Randomization & Time Point CSV
An additional file is downloaded with the LPF and contains the following columns:

- Well number (index 0)  
- Randomization index (same as above unless wells randomized, for decoding randomization)
- Time point for each well (final time if constant or otherwise unset)

## Packages
The following packages and utilities were used in the creation of the LPI:

* [jQuery](https://jquery.com/) & [jQuery UI](https://jqueryui.com/)  
* [Handsontable](http://handsontable.com/)  
* [jsZip](https://stuk.github.io/jszip/)  
* [Numeric Javascript](http://numericjs.com/)  
* [CanvasJS](http://canvasjs.com/) [[Noncommercial License](http://creativecommons.org/licenses/by-nc/3.0/legalcode); no changes made]  
* [FileSaver](https://github.com/eligrey/FileSaver.js/) [[License](https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md)]  
* [Tooltipster](http://iamceege.github.io/tooltipster/)
* [Angular JS](https://angularjs.org/)
* [Pandoc](http://pandoc.org/index.html) (for creating this documentation)
* [MathJax](http://www.mathjax.org/) (via Pandoc)
* [Bourbon CSS](http://bourbon.io/)
* [SASS CSS](http://sass-lang.com/)

The standalone Python LPF Encoder script uses [Numpy](http://www.numpy.org/) and was made using [iPython](http://ipython.org/) [Notebook](https://jupyter.org/).

## License
Copyright (c) 2015, Felix Ekness, Lucas Hartsough, Brian Landry. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.  
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation
and/or other materials provided with the distribution.  
3. Neither the name of the Rice University nor the names of its contributors may be used to endorse or promote products derived from this software
without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,STRICTLIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCHDAMAGE.