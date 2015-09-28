class LPFEncoder():
	'''Represents the overall device, containing all device metadata (rows,
		cols, etc.), and an intensity matrix corresponding to each well and
		channel for each time point.
		REQUIRES: Numpy
	Input parameters:
		gsVals [Required]: Numpy array of intensities for each timestep in each
							channel, in order
			Structure: [times][wells/indices][channels] (3-dimensional)
	deviceParams [Required]: dict containing all device parameters
		'channelNum': (int) number of channels in the device
					(TOTAL channels, ie wells*channels per well)
		'numSteps': (int) number of timesteps
		'timeStep': (int) time step resolution for LPF file (ms)
	filename [Required]: str with full path and filename to write LPF file.
						Will be written automatically.'''

	def __init__(self, gsVals, deviceParams, filename):
		import numpy as np
		# Use deviceParams to initialize vars
		try:
			self.channelNum = deviceParams['channelNum']
			self.timeStep = deviceParams['timeStep']
			self.numSteps = deviceParams['numSteps']
		except KeyError:
			raise KeyError("deviceParams must have the following keys: channelNum, timeStep, numSteps")
		## Indices: 0: time point; 1: wellNum; 2: channel number
		## It's formatted this way to make sure np.flatten() works correctly.
		self.gsVals = np.array(gsVals, dtype=np.int16)
		# test that the gsVals array has the correct shape
		gsVshape = np.shape(gsVals)
		if gsVshape[1]*gsVshape[2]*gsVshape[3] != self.channelNum:
			raise IOError("gsVals shape must match the deviceParams number of (TOTAL) channels")
		if self.numSteps != gsVshape[0]:
			raise IOError("gsVals shape must match the deviceParams number of time points")
		# write program to the given file name/path
		self.writeProgram(filename)

	def writeProgram(self, filename):
		'''Writes output binary file to given path.'''
		###
		# Header Specs
		# V 1.0
		###
		# Each header field is 32 bits:
		# byte 0-3: FILE_VERSION - header version number (1.0 in this case)
		# bytes 4-7: NUMBER_CHANNELS - number of channels
		##	This value will be checked against the number of channels of the
		##	device at the beginning of the program, and it will issue an error
		##	if they don't match. This will prevent programs from one device to
		##	be erroneously used on another one.
		# bytes 8-11: STEP_SIZE - time step size, in ms
		# bytes 12-15: NUMBER_STEPS - number of time points
		# bytes 16-31: <RESERVED> - reserved for future header fields, all set to 0 otherwise
		# bytes >=32: intensity values of each channel per timepoint
		##	For each value, two bytes will be used as a long 16-bit int.
		import array as ar
		import numpy as np

		header = np.zeros(8, dtype=np.int32)
		header[0] = 1 # file version
		header[1] = self.channelNum # TOTAL number of channels
		header[2] = self.timeStep # time step size, in ms
		header[3] = self.numSteps # number of time points
		for i in range(4,8): # remaining (empty) header bytes
			header[i] = 0
		header = ar.array('l', header) # 32-bit
		output = ar.array('h', self.gsVals.flatten()) # 16-bit
		# write the bytes to file
		outfile = open(filename, 'wb')
		header.tofile(outfile)
		output.tofile(outfile)
		outfile.close()

########
# Helper functions independent of LPFEncoder
########

def findIndex(times, t):
	'''Finds index of time closest to t in given times array.'''
	if t > times[-1] or t < times[0]:
		raise IOError("The time findIndex is looking for is outside the range of times.")
	return np.where(times==min(times, key=lambda x:abs(x-t)))[0][0]

def RCtoWellNum(row, col, cols=6, rows=4):
	'''Returns the wellnumber of a given (row, col) position.'''
	wellNum = row*cols + col
	if wellNum < 0 or wellNum > rows*cols - 1:
		raise IOError("RCtoWellNum is trying to return a wellNum outside the allowed range.")
	return wellNum

def wellNumToRC(wellNum, cols=6, rows=4):
	'''Returns the row & column position of a given well number.'''
	wellNum = int(wellNum)
	row = wellNum / cols
	col = wellNum % cols
	if row > rows - 1 or row < 0:
		raise IOError("wellNumToRC is trying to specify a row outside the device range.")
	if col > cols - 1 or col < 0:
		raise IOError("wellNumToRC is trying to specify a col outside the device range.")
	return (row, col)