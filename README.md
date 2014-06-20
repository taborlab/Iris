#The Light Program Interface

A user interface which generates Light Program Files (.lpf) for use in multiple different piece of lab equipment used with optogenetic setups. It uses a HTML5/javascript frontend with a python based backend.

##Work Flow

1. Select Hardward Settings (Client)
2. Select Waveform Specifications (Client)
3. Generate emulation LPF (Server)
4. Test Emulation (Client)
5. Generate LPF (Server)
6. Download LPF (Client)

##Hardware Specifications

- # Rows
- # Columns
- # LEDs
- LED Wavelengths

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
- Organize by rows or columns

###Step function
- Amplitude
- Time
- Sign of step
- Time to start sampling
- Number of samples

###Sine Wave

Inputs a sine wave where each well experiences the same sine wave but the phase is shifted, such that at the end of a run each well is at a different point in the period.

- Amplitude
- Frequency
- Phase
- Offset
 
###Writing LPF File

LPF file has a particular header:

* byte 0: 8 bit int with number of (additional) header bytes
* bytes 1-4: 32-bit int with number of channels
* bytes 5-8: 32-bit int with time step size, in ms
* bytes 9-12: 32-bit int with number of time points
* bytes >=13: intensity values of each channel per timepoint
* for each value, two bytes will be used as a long 16-bit int.
	
Because of the above structure, specifically that every time step is encoded explicitly, and that each is encoded using a 16-bit (2 byte) integer, there is a fair amount of bandwidth overhead for each file. **To keep things reasonable, we will have to limit time steps to 1 sec.**