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

## Writing an LPF using Python
*Requires Numpy.*

Occasionally, users comfortable with coding may want to quickly create algorithmic LPF files based on custom code outside
of LPI. To facilitate this, a simple python script has been added that can do just this. It will (hopefully) be maintained
in parallel with any changes to the header information & LPF format in the main LPI code.

To create an LPF in this way, users will have to ensure that their data is in a Numpy matrix with the correct dimensionality
(indices refer to: [Time][wellNumber][channelNum]). The user is entirely responsible for ensuring that their matrix matches
the device they have chosen to use. The second input parameter is a dictionary of device parameters for the header of the LPF:
'channelNum' is the TOTAL number of channels (channels per well * number of wells); 'timeStep' is the timestep in ms; 
'numSteps' is the total number of timesteps in the LPF. Finally, the given filename is the complete (relative) path to the 
desired file location AND the desired filename, including suffix (.lpf).

### The Randomization & Time Point CSV

An additional file is downloaded with the LPF and contains the collowing columns:

- Well number (index 0)
- Randomization index (same as above unless wells randomized, for decoding randomization)
- Time point for each well (final time if constant or otherwise unset)