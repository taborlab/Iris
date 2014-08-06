#The Light Program Interface

A web application designed to enable easy programming and creation of Light Program Files (.lpf) for use in Tabor Lab optogenetic hardware.
It uses HTML5 and JavaScript to acquire desired light function parameters, perform intensity & time-shifting calculations, and finally
deliver output files to the user, all on the client side to limit bandwidth.

##Work Flow

1. Select hardward settings
2. Select waveform (light function) specifications
3. Generate simulation of light output
4. Assess, debug simulation
5. Generate & download LPF, randomization CSV

##Hardware Specifications

- # Rows
- # Columns
- # LEDs
- LED Wavelengths, RGB/hex colors for display (hard-coded)
- Maximum greyscale (GS) value (hard-coded)

##LPF Specifications
- Time step
- Total time
- Randomized Boolean

##Waveform Specifications

###General function
- Start Well
- Column or Row orientation
- # replicates
- LED #

###Constant

- List of intensities

###Step function
- Amplitude
- Time
- Sign of step
- Time to start sampling
- Number of samples

###Sine Wave

Inputs a sine wave where each well experiences the same sine wave but the phase is shifted, such that at the end
of a run each well is at a different point in the period.

- Amplitude
- Frequency
- Phase
- Offset

### Arbitrary Function

Users have the ability to specify an arbitrarily-complex light function by uploading a CSV containing columns of:

- Times at which light intensity changes
- New greyscale values to be set at the above times
- The desired time points (for time shifting); number determines the number of wells used
 
###Writing LPF File

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

An additional file is downloaded with the LPF and contains the collowing columns:

- Well number (index 0)
- Randomization index (same as above unless wells randomized, for decoding randomization)
- Time point for each well (final time if constant or otherwise unset)