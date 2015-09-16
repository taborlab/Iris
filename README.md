#The Light Program Interface (LPI)

A web application designed to enable easy programming and creation of Light Program Files (LPFs) for use in [Tabor Lab](http://taborlab.rice.edu/) optogenetic hardware.
It uses HTML5 and JavaScript to acquire desired light function parameters, perform intensity & staggered-start calculations, and finally
deliver output files to the user, all in the browser.

## Introduction

The Light Program Interface is designed to be a flexible interface for the [Tabor Lab](http://taborlab.rice.edu/) standardized optogenetic hardware platform. It is designed to:

1. Program optogenetic time courses in the hardware by compiling the desired Light Program File for a particular device,
2. Help with optogenetic program design and debugging with a full hardware (LED) simulation display,
3. Serve as an experimental support utility by creating files documenting a particular experiment's well randomization positions, desired time points, etc., in a CSV file,
4. Create a convenient record of previous optogenetic experiments by generating an LPI file that can be later used to reload a particular light program in the LPI.

Note that for advanced users, there is also a standalone Python script that can convert more complex and arbitrary light programs into device-readable LPF files; however the LPI should be sufficient for all normal use cases.

## Contents
- [Getting Started](#getting-started)
    - [Select an optogenetic device from the dropdown menu](#select-an-optogenetic-device-from-the-dropdown-menu)
    - [Enter global experimental parameters](#enter-global-experimental-parameters)
    - [Add a New Experiment using the button](#add-a-new-experiment-using-the-button)
        - [Timepoints](#timepoints)
        - [Replicates](#replicates)
    - [Add waveforms to the Experiment](#add-waveforms-to-the-experiment)
        - [Constant Waveform](#constant-waveform)
        - [Step Waveform](#step-waveform)
        - [Sine Waveform](#sine-waveform)
        - [Arbitrary Waveform](#arbitrary-waveform)
    - [Assess and debug the input waveform set using Experiment View](#assess-and-debug-the-input-waveform-set-using-experiment-view)
    - [Load and assess the hardware simulation](#load-and-assess-the-hardware-simulation)
        - [Plate View](#plate-view)
        - [Well View](#well-view)
    - [Download the output files](#download-the-output-files)
- [Detailed Nuts and Bolts](#detailed-nuts-and-bolts)
    - [De-randomization Procedure](#de-randomization-procedure)
    - [The Staggered Start Algorithm](#the-staggared-start-algorithm)
    - [LPF File Specifications](#lpf-file-specifications)
- [Packages](#packages)
- [License](#license)

## Getting Started

### 1. **Select an optogenetic device from the dropdown menu**
A variety of devices are supported in addition to those detailed in our publication, though the most common selection will be the 24-well plate device (LPA). This will automatically configure the LPI to have the correct number of wells and correct LED wavelengths for simulation later. If you have a custom device running LPI firmware, then you can use the `Custom Configuration`, which will prompt you to enter the number of rows and columns in your custom device, as well as the number of LEDs in each well and their wavelengths in the section that appears.

### 2. **Enter global experimental parameters**
Some parameters apply to the entire experiment, such as the total experiment time length (in minutes), whether the well positions should be randomized, and whether the LEDs should all be turned off at the end of the experiment (check boxes). The `Experiment Length` should include all phases of the experiment, including any dark or preconditioning phases, which will be specified later. If you choose to randomize the well positions (highly recommended), you will be provided with the generated randomization matrix when you download the LPF so that you can descramble the data during analysis. We recommend turning off the LEDs at the end of the experiment, since this serves as a convenient indicator that the program has run its complete course.

### 3. **Add a New Experiment**
Experiments define groups of wells in the plate device that are related, typically because they are all timepoints or measurements of the same dynamic experiment (i.e. all wells are receiving versions of the same input signal with staggered start times). An experiment can utilize any number of wells in the plate, and the number used by a particular experiment will automatically be updated as inputs are entered. All Experiments (and Waveforms) can be minimized at any time during input to make room for additional input elements by clicking the chevron to the left of the Experiment header.

#### *Timepoints*
In a dynamic experiment, the LPI can automatically generate a set of evenly-spaced timepoints or use a custom set (to focus data on early-time responses, for example). For generated timepoints, enter the number of desired time points and the delay (in minutes) until the first time point, if any. For custom timepoints, simply paste a list of comma-separated timepoints into the array (all units in minutes). **Steady-state experiments should use the default value of 1 for the number of timepoints.**

#### *Replicates*
Enter the number of experimental replicates of this experiment. The number of wells specified by the Experiment's Waveform inputs will be replicated accross the plate `Replicates` number of times (i.e. `Replicates = 1` indicates that *no additional* wells will be used). Note that this will very quickly consume available wells.

### 4. **Add Waveforms to the Experiment**
The four icons represent the four fundamental waveform inputs programmed into the LPI: constant, step change, sinusoid, and arbitrary, which can be added to the Experiment by clicking the corresponding icons. Each Waveform represents a light input applied to the desired wells in a particular LED channel. Importantly, **waveforms cannot be composed** - that is, multiple waveforms cannot be applied to the same LED in the same well. More complex inputs (e.g. a series of step inputs) should be entered using the (more efficient) Arbitrary Waveform.
Note that all light intensities (amplitudes) are given in hardware greyscale units (GS), which must be in the range $[0,4095]$ Also note that if multiple intensities are given to the Constant or Step Waveforms, **each intensity will be separately applied to every other waveform in the experiment**, since multiple intensities of a single LED cannot be applied to the same well. In other words, every possible combination of amplitudes is used. For example, if 2 intensities are entered in a Step Waveform (e.g. 1000GS & 2000GS), and the Experiment specifies 10 samples ("time points") and 1 replicate, the Experiment will use 20 wells in the plate.

#### *Constant Waveform*
$$f(t) = c$$
Constant inputs are used to apply competing amounts of deactivating light and to measure the steady-state dose response function. Obviously, they only have a single input parameter.

#### *Step Waveform*
$$f(t) = a * H(t-\tau) + c$$
Step inputs (i.e. Heaviside step; $H(t)$) are used for dynamic characterization and have 3 parameters:

  * **Amplitude ($a$)**: the size of the step change, in GS units. *Note that step amplitudes can be negative! This indicates a step-down.*
  * **Step offset ($c$)**: the vertical offset of the step function in GS units (constant addition accross all time points)
  * **Time shift ($\tau$)**: the amount of time (min) after the beginning of the experiment that the step should happen.
  **Note:** this is different from the Experiment parameter regarding the delay until the first time point! This is specifying a change in the light input for this waveform; the delay until the first time point is specifying a change in the staggered-start for all wells in the Experiment.

#### *Sine Waveform*
$$f(t) = a * \sin \left(\frac{2\pi \left(t - \phi\right)}{T}\right) + c$$
Sinusoidal inputs are an alternative input signal for dynamic characterization and have 4 parameters:

  * **Amplitude ($a$)**: The amplitude of the sine (half the peak-to-peak amplitude) in GS units
  * **Period ($T$)**: The period of the wave, in minutes; the inverse of the wave frequency
  * **Phase ($\phi$)**: The phase shift of the wave, in minutes
  * **Offset ($c$)**: The vertical offset of the wave, in GS units

#### *Arbitrary Waveform*
$$f(t) = \sum_{i=0}^n a_i H(t-\tau_i)$$
Arbitrary Waveforms allow input of any more complex function as a series of light intensities ($a_i$) and corresponding times at which the LED will switch to that intensity ($\tau_i$). These are entered as a list of values in the Excel-like table under their respsective headings. The switch times are the time since the beginning of the experiment (not related to timepoints), in minutes. The light intensities are in greayscale (GS) units. Because the smallest time resolution for the resulting LPF file is 1 sec, this is also the smallest valid time step for arbitrary inputs.

### 5. Assess and debug the input waveform set using Experiment View
Once the desired set of waveforms has been entered, check their accuracy using the Experiment View popup, which will plot the given waveforms for each LED as functions of time and display the locations of the specified timepoints. This is an opportunity to visualize the relationship between the waveforms as specified and the timepoints that will be acquired in the experiment. Note that Plate View and Well View (detailed below) will show a hardware simulation of the LED intensities, meaning the staggered-start algorithm will be applied to the light course, based on which timepoint a particular well represents. Experiment View, in contrast, shows your timepoints as they relate to the overall optogenetic input signal. *In other words, Experiment View represents the view you would plot during analysis.*

### 6. Load and assess the hardware simulation
To load a simulation of the specified light program, first ensure that no input fields have been marked as invalid. A tooltip will appear on mouseover to indicate the relevant error for a particualr field, if it is invalid. If the inputs for each Experiment are valid, LPI will automatically load a hardware simulation in the right hand panel. This simulation has two aspects: Plate View, which is an overview of LED intensity over time for the entire plate; and Well View, which displays a light timecourse plot for all LEDs in a particular well.

#### Plate View
The default view is **Plate View**, which shows an overview of the entire plate device. Using the dropdown menu in the navigation bar at the top, the display can be limited from showing all (illuminated) LEDs to only particular LEDs. Clicking on a well in the plate visualization will select that well, updating the position and well number in the nav bar. The up, down, left, and right arrow keys can also be used to change the selected well. Clicking the play button will begin the hardware simulation, and will show the response of the plate device to the generated light program over time. The Speed slider bar will decrease or increase the simulation playback speed.

#### Well View
To get more detail about a particular well, simply click the well in Plate View and then click `Well View` in the nav bar. **Well View** plots the LED intensity for all LEDs in a well as a function of time. Click and drag horizontally in the plot area to zoom in on that region of the plot. Notice that, again, the smallest time resolution for the program is 1 sec, which will cause some apparent aliasing at small timescales. To remove the plot for an LED, simply click its entry in the legend. A floating tooltip indicates the LED intensities corresponding to the time currently under the mouse cursor. The arrow keys will still change the selected well and can be used to rapidly move through adjacent wells' Well Views.

### 7. Download the output files
If everything looks good, then initiate the download of the generated files by clicking the `Download` button at the bottom of the inputs. The zipped folder includes the following files:

* **program.lpf**
  This is the hardware-readable Light Program File that will be loaded onto an SD card, which will then be processed by the plate hardware into LED intensities. Its file structure is detailed below, but is basically a binary composed of a short header and a series of intensities at each time point in the experiment. **The filename of this file must remain unchanged in order to be read correctly by the firmware.**
* **randomizationMatrix.csv**
This CSV contains all the information necessary for analysis after the experiment is completed:
    * **Program [Well] Index**: List of well numbers, top to bottom, left to right
    * **True Well Location**: Also known as the randomization matrix; randomized positions of the corresponding wells in the Well Index column. See below for the correct de-randomization algorithm.
    * **Time Points**: Since each well corresponds to a staggered-start timepoint in a dynamic run, these are listed here. Steady state programs (i.e. wells with only constant waveforms) will use the total Program Duration as the Time Point.
* **savefile.lpi**
  This file represents a complete image of the exact LPI session (including all inputs) used to generate the LPF file. This file can be used to reload the LPI session at a later date. Its primary function is to enable modification of a previous light program for future experiments and as a record for exactly what the corresponding LPF encodes. **Note: This file does NOT contain the randomization matrix, and future (additional) LPF files created by uploading this to the LPI will not use the same randomization.**

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

### The Staggered Start Algorithm
In order to perform dynamic light experiments, the input signal applied to each well in an experiment is staggered such that at the end of the program, that well will end at the desired timepoint. The time difference is made up by exposing the well to the Preconditioning light condition for all times before the time-shifted program for the well begins. For example, the `t=600min` timepoint in a 720min program will experience the Preconditioning light condition for 120min, and then begin the staggered program. It will experience the first 600min of the program, at which point the experiment will end. This procedure is repeated for all wells in an experiment. *Note that this is why Well View may be unintuitive initially, as the only wells that will match the Experiment View are wells corresponding to the `t=0min` timepoint.*

![**Schematic of the staggered-start algorithm.** Although each well spends the same amount of time being simultaneously illuminated (all grey bars are the same size), the portion of the Experiment's input signal that they use is adjusted based on their assigned timepoint. For the sine wave, which is periodic, the signal is simply phase-shifted for each well. For non-periodic inputs, wells experience the Precondition light input for all times in the program up to their switch point (detailed below), afterward experiencing the first $n$ minutes of the specified light input (for the timepoint corresponding to $n$ minutes). Note that the `t=0` timepoint has no apparent staggered start.](Doc_TimeShifted_Inputs_small.png "Schematic of how wells experience a staggered input signal to measure dynamics.")

More specifically, the Preconditioning light input for each function is as follows:

| Input Waveform | Precondition Value |
|:---------------|:-------------------|
|Constant        | N/A                |
|Step            | Input intensity before step (i.e. the step offset, $c$)|
|Sine            | Because sines are periodic, no precondition state is necessary; the function is simply phase shifted by the appropriate amount.|
|Arbitrary       | Arbitrary functions require the input of a user-defined precondition state.|

### LPF File Specifications
Generally, the LPF binary should not need to be examined directly during the standard workflow; however, its format is detailed below should it be necessary:

The LPF file has a header segment encoded by 32-bit (4-byte) ints:

| Bytes | Variable Name | Precondition Value |
|:---------------|:--------------------|:-------------------|
| 0-3 | FILE_VERSION  | LPF version number, currently `1` |
| 4-7 | NUMBER_CHANNELS | number of channels -- **Note:** This is the total number of LED channels (e.g. `2*24 = 48`), not per well |
| 8-11 | STEP_SIZE | time step size, in ms (default: 1000ms to limit total program file size) |
| 12-15 | NUMBER_STEPS | number of time points (total program time / STEP_SIZE + 1) |
| >= 16 | n/a | intensity values of each channel per timepoint. For each value, two bytes will be used as a long 16-bit int |

Values are listed in a depth-first manner (i.e. all LEDs for a particular well, then proceeding to the next well), moving top-to-bottom, and left-to-right accross the plate device. The LED order is a hard-coded parameter for each device, and is dependent on the particular configuration of the PCB.

Because of the above structure, specifically that every time step is encoded explicitly, and that each is encoded
using a 16-bit (2 byte) integer, there is a fair amount of overhead for each file. **To keep things reasonable, we limit time steps to 1 sec, minimum.**

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

## Supported Browsers

The LPI should be fully functional on all up-to-date versions of: Chrome, Safari, Firefox, and Internet Explorer.

## License (MIT License) {#license}
Copyright (c) 2015, Felix Ekness, Lucas Hartsough, Brian Landry. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation
and/or other materials provided with the distribution.
3. Neither the name of the Rice University nor the names of its contributors may be used to endorse or promote products derived from this software
without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,STRICTLIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCHDAMAGE.