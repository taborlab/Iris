import webapp2
import numpy as np
import os, sys
from google.appengine.api import app_identity
sys.path.append(os.path.join(os.path.dirname(__file__), 'lib'))
import cloudstorage as gcs

###
# Global Debug Parameters
debug = 0
###

###
# Server Request Handlers
###

class MainPage(webapp2.RequestHandler):
	def get(self):
		# Normal Get requests to the main page return the webform:
		indexfile = open('index.html', 'r')
		formlines = ''.join(indexfile.readlines())
		self.response.headers['Content-Type'] = 'text/html'
		self.response.write(formlines)

class FormHandler(webapp2.RequestHandler):
	# The submit button on the main page passes a Post request with the form data:
	def post(self):
		deviceParams = {}
		
		## Pull in form data
		deviceParams['device'] = self.request.get("devices") # not really necessary...
		try:
			deviceParams['rows'] = int(self.request.get("rows"))
			deviceParams['cols'] = int(self.request.get("columns"))
			deviceParams['channelNum'] = int(self.request.get("LEDnum"))
		except ValueError:
			raise ConfigError("'rows'/'cols'/'LEdnum' string cannot be cast to int")
		if deviceParams['rows'] < 0 or deviceParams['cols'] < 0 or deviceParams['LEDnum'] < 0:
			raise ConfigError("'rows'/'cols'/'LEDnum' must be postiive")
		
		# Pull wavelengths; also not really necessary
		deviceParams['wavelengths'] = {}
		for i in range(deviceParams['channelNum']):
			deviceParams['wavelengths'][str(self.request.get("LED%d"%i))] = int(self.request.get("LED%d"%i))
		
		# Pull experiment time (min) -> (sec) -> (ms):
		try:
			deviceParams['totalTime'] = int(self.request.get("length")) * 60 * 1000 # millisec
			deviceParams['timeStep'] = int(float(self.request.get("timestep")) * 1000) # millisec
		except ValueError:
			raise ConfigError("'totalTime'/'timeStep' could not be cast as ints")
		if deviceParams['totalTime'] < 0 or deviceParams['timeStep'] < 0:
			raise ConfigError("'totalTime'/'timeStep' must be positive")
		
		# Randomization flag
		deviceParams['randomized'] = self.request.get("randomized")
		if deviceParams['randomized'] == '':
			deviceParams['randomized'] = False
		else:
			deviceParams['randomized'] = True
		
		# max GS value for device -- passed param to be added; hard coded for now
		deviceParams['maxGSValue'] = 4095
		
		# Function parameters
		deviceParams['functions'] = []
		## placeholder data:
		#deviceParams['functions'].append({'funcType':'Constant', 'startTube':0, 'orientation':'rows', 'replicates':1,'channel': 'LED0', 'intensities':[0,1,2,3,4]})
		#deviceParams['functions'].append({'funcType':'Step', 'startTube':0, 'orientation':'rows', 'replicates':1,'channel': 'LED0', 'amp': 4095,'stepTime':30, 'sampleNum':12,'sign': 'up'})
		#deviceParams['functions'].append({'funcType':'Sine', 'startTube':0, 'orientation':'rows', 'replicates':1,'channel': 'LED0', 'amp': 4095,'period':30, 'sampleNum':12,'phase': '15', 'offset':2047})
		
		constFormParams = ['funcType', 'start', 'orientation', 'replicates', 'funcWavelength', 'ints']
		stepFormParams = ['funcType', 'start', 'orientation', 'replicates', 'funcWavelength', 'amplitude', 'stepTime', 'samples', 'sign']
		sineFormParams = ['funcType', 'start', 'orientation', 'replicates', 'funcWavelength', 'amplitude', 'period', 'samples', 'phase', 'offset']
		arbFormParams = ['funcType', 'start', 'orientation', 'funcWavelength', 'stepTimes', 'stepValues', 'timePoints', 'precondition']
		funcFormParams = {'constant':constFormParams, 'step':stepFormParams, 'sine':sineFormParams, 'arb':arbFormParams}
		
		
		#########
		### Pull all function params
		#########
		
		def pullFuncParams(params, funcNum):
			'''Takes list of func params and function number. Returns dict with func params'''
			funcParamValDict = {}
			for p in params:
				paramKey = p + '%d'%funcNum
				pval = self.request.get(paramKey)
				if p in ['funcType', 'orientation', 'sign']: # strings
					pval = str(pval)
				elif p in ['replicates', 'amplitude', 'samples', 'offset', 'funcWavelength', 'precondition','start']: # ints
					if p == 'funcWavelength':
						pval = int(pval[-1])
					else:
						try:
							pval = int(float(pval))
						except ValueError:
							raise ConfigError("Parameter value for %s cannot be cast as an int"%p)
					if (p == 'amplitude' or p == 'precondition' or p == 'offset') and (pval < 0 or pval > deviceParams['maxGSValue']):
						raise ConfigError("Function %d parameter %s must be positive and less than %d: pval=%d"%(funcNum, p, deviceParams['maxGSValue']), pval)
					elif (p == 'start' or p == 'samples') and (pval > (deviceParams['rows'] * deviceParams['cols']-1) or pval < 0):
						raise ConfigError("Function %d parameter %s must be positive and less than the number of wells - 1: pval=%d"%(funNum, p, pval))
					elif pval < 0:
						raise ConfigError("Function %d parameter %s must be positive: pval=%d"%(funcNum, p, pval))
				elif p in ['stepTime', 'period', 'phase']: # floats
					pval = float(pval)
				elif p in ['ints', 'stepTimes', 'stepValues', 'timePoints']: # lists
					inpstr = pval.strip(' ').split(',')
					if p == 'ints' or p == 'stepValues': # GS values must be ints
						pval = []
						for i in inpstr:
							try:
								i = int(float(i))
							except ValueError:
								raise ConfigError("GS value in %s could not be cast as int"%p)
							if i < 0 or i > deviceParams['maxGSValue']:
								raise ConfigError("All GS values in %s must be in range: 0<int<%d"%(p, deviceParams['maxGSValue']))
							pval.append(i)
					else: # times can be floats, though they should be ints in ms
						pval = []
						for i in inpstr:
							try:
								i = float(i)
							except ValueError:
								raise ConfigError("Time value in %s could not be cast as float"%p)
							if i < 0 or i > deviceParams['totalTime']:
								raise ConfigError("All time values in %s must be in range: 0<time<%d"%(p, deviceParams['totalTime']))
							pval.append(i)
				else:
					raise ConfigError("function key does not match known function parameters: %s"%p)
				funcParamValDict[p] = pval
			return funcParamValDict
		
		#funci = 0
		#while True:
		#	funcType = str(self.request.get('funcType%d'%funci))
		#	if funcType == '':
		#		break
		#	try:
		#		funcFormKeys = funcFormParams[funcType]
		#	except KeyError:
		#		raise ConfigError("funcType passed does not match known function types.")
		#	func = pullFuncParams(funcFormKeys, funci)
		#	deviceParams['functions'].append(func)
		#	funci += 1		
		
		
		######
		## Set up GCS
		######
		
		#bucket_name = os.environ.get('BUCKET_NAME', app_identity.get_default_gcs_bucket_name())
		bucket_name = 'light-programming-interface.appspot.com'
		######
		
		device = Device(deviceParams)
		LPFprogram = device.getProgram()
		
		
		#########
		## Send response
		#########
		
		if debug:
			self.response.headers['Content-Type'] = 'text/plain'
			self.response.write(self.request)
			#self.response.write("\n\nProgram:\n")
			#self.response.write(LPFprogram)
			#output = "%s"%deviceParams['functions']
			#output += "\n\nDevice Params:\n"
			#for key in deviceParams.keys():
				#if key != 'functions' and key != 'randomized':
					#output += "%s:\t%s\n"%(key, deviceParams[key])
			#output += "\nTimes length: %d\n"%len(device.times)
			#gsvalsshape = str(np.shape(device.gsVals))
			#output += "gsVals shape: "+gsvalsshape+'\n'
			output = "\n\nGCS Tests:\n"
			self.response.write(output)
			self.response.write('Demo GCS Application running from Version: ' + os.environ['CURRENT_VERSION_ID'] + '\n')
			self.response.write('Using bucket name: ' + bucket_name + '\n\n')
			bucket = '/' + bucket_name
			testfilename = bucket + '/testfile'
			self.response.write("Creating file %s..."%testfilename)
			gcs_file = gcs.open(testfilename,'w',content_type='text/plain',
						options={'x-goog-meta-foo': 'foo',
							'x-goog-meta-bar': 'bar'})
			gcs_file.write('abcde\n')
			gcs_file.write('f'*10*4 + '\n')
			gcs_file.close()
			self.response.write("\nFile written (hopefully). Reading...\n")
			gcs_file = gcs.open(testfilename)
			self.response.write(gcs_file.readline())
			self.response.write(gcs_file.read())
			gcs_file.close()
		else:
			filename = 'program.lpf'
			self.response.headers['Content-Type'] = 'application/octet-stream'
			self.response.headers['Content-Disposition'] = 'attachment; filename=%s'%filename
			LPFprogram = device.getProgram()
			#fileName = device.getProgram()
			#LPFprogram = open(fileName, 'rb').readlines()[0]
			bucket = '/' + bucket_name
			#testfilename = bucket + '/testfile'
			gcs_file = gcs.open(filename,'w',content_type='application/octet-stream')
			#gcs_file.write('abcde\n')
			#gcs_file.write('f'*10*4 + '\n')
			#testdata = np.zeros(10, dtype=np.int16)
			#import array as arr
			#testdata = arr.array('h', testdata)
			#testdata.tofile(gcs_file)
			gcs_file.write(LPFprogram.tostring())
			gcs_file.close()
			gcs_file = gcs.open(testfilename)
			self.response.write(gcs_file.read())
			gcs_file.close()
			#self.response.write(LPFprogram)


		
### 
# Helper (Object) Classes
###

class Device():
	'''Represents the overall device, containing all device metadata (rows, cols, etc.),
	as well as all light functions and an intensity matrix corresponding to each well
	and channel for each time point.
	Input parameters:
	deviceParams: dict containing all device parameters and functions to be programmed
		'device': (str) name of the device
		'rows': (int) number of rows in the device
		'cols': (int) number of cols in the device
		'wavelengths': (list/int) list of wavelengths for each channel in device
		'channelNum': (int) number of channels in the device
		'totalTime': (int) total length of the run (ms)
		'timeStep': (int) time step resolution for LPF file (ms)
		'randomized': (bool) randomization flag
			NOTE: Must extract randomization matrix manually (self.randMatrix)
		'functions': (dict) dictionary contianing all functions to be programmed
			Common function parameters:
			'funcType': (str) function identifier, ['constant', 'sine', 'step', 'arb']
			'start': (int) well number of first tube to be programmed by this function
			'orientation': (str) increment wells by rows or cols, ['rows', 'cols']
			'replicates': (int) number of replicates to be made (EXCEPT 'arb' runs)
			'funcWavelength': (int) index of channel to be programmed, usually [0,1,2,3]
			Function-specific parameters:
			Constant:
				'ints': (list/ints) list of GS intensities, one for each tube
			Step:
				'amplitude': (int) GS intensity of step change
				'stepTime': (int) time of step change (ms)
				'samples': (int) number of time points to pull out (sets number of wells)
				'sign': (str) whether step is up or down, ['stepUp', 'stepDown']
			Sine:
				'amplitude': (int) GS amplitude of the sine wave
				'period': (float) period of the sine wave (ms)
				'phase': (float) phase lag of the sine wave (ms)
				'samples': (int) number of samples, equally dispersed (number of tubes)
				'offset': (int) GS offset of the sine wave
			Arbitrary (arb): NOTE: no 'replicates'
				'stepTimes': (list/float) List of times corresponding to switch to new amplitudes in 'stepValues' at same index
				'stepValues': (list/int) List of (absolute!) GS intensities for each time step
				'timePoints': (list/float) List of times at which to sample, length corresponds to number of tubes
				'precondition': (int) Precondition GS intensity for time shifting
				
	filename: str with full path and filename to write LPF file. Will be written automatically.'''
	
	def __init__(self, deviceParams, filename=None):
		
		# Use deviceParams to initialize vars
		self.device = deviceParams['device']
		self.rows = deviceParams['rows']
		self.cols = deviceParams['cols']
		self.tubeNum = self.rows * self.cols
		self.wavelengths = deviceParams['wavelengths']
		self.channelNum = deviceParams['channelNum']
		self.totalTime = deviceParams['totalTime']
		self.timeStep = deviceParams['timeStep']
		self.randomized = deviceParams['randomized']
		self.functions = deviceParams['functions']
		self.numPts = int(self.totalTime/self.timeStep + 1)
		self.randMatrix = range(self.tubeNum) # matrix with true well numbers for randomized tubes. Same as wellNum for unrandomized
		if self.randomized:
			np.random.shuffle(self.randMatrix)
		self.maxGSValue = deviceParams['maxGSValue']
		# set up array of time points
		self.times = np.arange(0, self.totalTime+self.timeStep, self.timeStep)
		## Indices: 0: time point; 1: row; 2: col; 3: channel number
		## It's formatted this way to make sure np.flatten() works correctly.
		self.gsVals = np.zeros((len(self.times), self.rows, self.cols, self.channelNum), dtype=np.int16)
		self.runFunctions()
		if filename is not None: # write program to the given file name/path
			self.getProgram(filename=filename)
	
	def runFunctions(self):
		'''Runs all functions in self.functions and applies them to self.gsVals.'''
		for func in self.functions:
			if func['funcType'] == 'constant':
				self.constant(func)
			elif func['funcType'] == 'step':
				self.step(func)
			elif func['funcType'] == 'sine':
				self.sine(func)
			elif func['funcType'] == 'arb':
				self.arbitraryStep(func)
			else:
				raise ConfigError("Unknown functype key passed.")
	
		
	def getProgram(self, quality='High', filename=None):
		'''Returns a filename to the output file. Quality can be 'Low' (for the
		simulator) or 'High' for actual programming. If 'filename' is passed,
		will write output binary file to given path.'''
		
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
		
		if quality == 'High': # writing to LPF file
			header = np.zeros(8, dtype=np.int32)
			header[0] = 1 # file version
			header[1] = self.channelNum # number of channels
			header[2] = self.timeStep # time step size, in ms
			header[3] = self.numPts # number of time points
			for i in range(4,8): # remaining (empty) header bytes
				header[i] = 0
			
			header = ar.array('l', header) # 32-bit 
			output = ar.array('h', self.gsVals.flatten()) # 16-bit
			if filename is not None: # write the bytes to file
				outfile = open(filename, 'wb')
				header.tofile(outfile)
				output.tofile(outfile)
				outfile.close()
			
		# writing to the buffer...
		#output = bytearray(output)
		#fileName = 'testFile.txt'
		#outFile = io.open(fileName, 'ab')
		#buffWriter = io.BufferedWriter(outFile)
		#buffWriter.write(output)
		#buffWriter.close()
		
		# append self.gsVals to output
		#~ for i in range(len(self.times)):
			#~ if self.times[i] % 100 == 0:
				#~ print "Calculating time index: %d"%i
			#~ gsNow = self.gsVals[:,:,:,i].flatten()
			#~ for gs in gsNow:
				#~ output += bin(gs)[2:].zfill(16)
		if filename is not None:
			return filename
		else:
			return output

	def constant(self, func):
		'''Sets all times to given (constant) intensity. Multiple intensities will be split
		accross a corresponding number of wells, according to 'orientation' parameter, followed
		by any replicates.'''
		# determine which wells are to be modified
		startWellNum = func['start']
		# set wells to given intensities
		intensities = func['ints'] * func['replicates']
		for i, intensity in enumerate(intensities): # for each tube
			# set to desired intensity
			if func['orientation'] == 'rows':
				r,c = self.wellNumToRC(self.randMatrix[startWellNum+i])
			else:
				r,c = self.incrementByCol(startWellNum, i=i, rand=self.randomized)
			w = func['funcWavelength']
			self.gsVals[:,r,c,w] = intensity

	def step(self, func):
		'''Takes existing gs values for a channel and adds/subtracts a step change in 
		gs intensity to all time points after 'stepTime' (ms) of value 'amplitude'.
		Note: amplitude gets ADDED to the well's previous value, instead of replacing it.
		Note: time pionts are linearly distributed starting at 'stepTime' and ending at the end of the experiment.
		NOTE: does NOT work for multiple steps!!'''
		# find closest index to the startTime
		try:
			startTimeIndices = [self.findIndex(i) for i in np.linspace(func['stepTime'], self.totalTime, func['samples'])][::-1] * func['replicates']
		except ConfigError:
			raise ConfigError("At least one time in step's startTimes is outside the range of possible times.")
		# determine which wells are to be modified:
		startWellNum = func['start']
		# set values
		for i,timeIndex in enumerate(startTimeIndices):
			if func['orientation'] == 'rows':
				r,c = self.wellNumToRC(self.randMatrix[startWellNum+i])
			else:
				r,c = self.incrementByCol(startWellNum, i=i, rand=self.randomized)
			w = func['funcWavelength']
			if func['sign'] == 'stepUp':
				if np.max(self.gsVals[timeIndex:,r,c,w]) + func['amplitude'] > self.maxGSValue:
					raise ConfigError("Step change is causing GS values over the max allowable.")
				self.gsVals[timeIndex:,r,c,w] = self.gsVals[timeIndex:,r,c,w] + func['amplitude']
			else:
				if np.min(self.gsVals[timeIndex:,r,c,w]) - func['amplitude'] < 0:
					raise ConfigError("Step change is causing GS values under the min allowable.")
				self.gsVals[timeIndex:,r,c,w] = self.gsVals[timeIndex:,r,c,w] - func['amplitude']

	def sine(self, func):
		'''Creates a sinusoidal intensity for all time points
		with amplitude 'amplitude' (gs), period 'period' (ms), y-offset of 'offset' (gs),
		and phase  shift of 'phase' (ms). 
		NOTE :the phase is SUBTRACTED (i.e. phase lag).'''
		# find remaining offset for sine wave:
		rem_offset = self.totalTime%func['period']
		# determine which wells to modify
		startWellNum = func['start']
		startTimes = np.tile(np.linspace(0,func['period'],func['samples'],endpoint=False),func['replicates'])
		# set values
		if func['amplitude'] + func['offset'] > self.maxGSValue:
			raise ConfigError("Maximum sine value is above the max allowable.")
		if func['amplitude'] - func['offset'] < 0:
			raise ConfigError("Minimum sine value is below the min allowable.")
		for i in range(len(startTimes)):
			if func['orientation'] == 'rows':
				r,c = self.wellNumToRC(self.randMatrix[startWellNum+i])
			else:
				r,c = self.incrementByCol(startWellNum, i=i, rand=self.randomized)
			w = func['funcWavelength']
			self.gsVals[:,r,c,w] = func['amplitude'] * np.sin(2*np.pi*(self.times+startTimes[i]-rem_offset)/func['period']-func['phase']) + func['offset']
			
	def arbitraryStep(self, func):
		'''Takes an arbitrary list of time/step values and programs the time-shifted tubes.
		arbFormParams = ['funcType', 'start', 'orientation', 'funcWavelength', 'stepTimes', 'stepValues', 'timePoints', 'precondition']
		'''
		funcTubeNum = len(func['timePoints'])
		precondition = func['precondition']
		stepTimes = func['stepTimes']
		stepValues = func['stepValues']
		startWellNum = func['start']
		tubeTimes = func['timePoints']
		
		if max(stepValues) > self.maxGSValue:
			raise ConfigError("No step amplitude in an arb function can be greater than the max allowable.")
		if min(stepValues) < 0:
			raise ConfigError("No step amplitude in an arb function can be less than the min allowable.")
		
		try:
			stepTimeInds = [self.findIndex(i) for i in stepTimes]
		except ConfigError:
			raise ConfigError("At least one time in arb's startTimes is outside the range of possible times.")
		try:
			tTimeInds = [self.findIndex(i) for i in tubeTimes]
		except ConfigError:
			raise ConfigError("At least one time in arb's tubeTimes is outside the range of possible times.")
		try:
			tShiftInds = [self.findIndex(self.totalTime - i) for i in tubeTimes]
		except ConfigError:
			raise ConfigError("At least one time in arb's tubeTimes is outside the range of possible times.")
		unshifted = np.zeros_like(self.gsVals[:,0,0,0]) # make an unshifted tube
		for j in range(len(stepTimes)+1):
			if j == 0:
				unshifted[:stepTimeInds[j]] = precondition
			elif j>0 and j<len(stepTimes):
				unshifted[stepTimeInds[j-1]:stepTimeInds[j]] = stepValues[j-1]
			else:
				unshifted[stepTimeInds[j-1]:] = stepValues[-1]
		for i in range(funcTubeNum)[::-1]:
			if func['orientation'] == 'rows':
				r,c = self.wellNumToRC(self.randMatrix[startWellNum+i])
			else:
				r,c = self.incrementByCol(startWellNum, i=i, rand=self.randomized)
			w = func['funcWavelength']
			if i-funcTubeNum-1==0 and self.totalTime-tubeTimes[i]==0: # first tube, check for no time shift
				self.gsVals[:,r,c,w] = unshifted
			else:
				self.gsVals[tShiftInds[i]:,r,c,w] = unshifted[:tTimeInds[i]+1]
				self.gsVals[:tShiftInds[i],r,c,w] = precondition
		
	def findIndex(self, time):
		'''Finds index of time closest to 'time' in self.times.'''
		if time > self.times[-1] or time < self.times[0]:
			raise ConfigError("The time findIndex is looking for is outside the range of times: time = %f"%time)
		return np.where(self.times==min(self.times, key=lambda x:abs(x-time)))[0][0]
	
	def wellNumToRC(self, wellNum):
		'''Returns the row & column position of a given well number.'''
		wellNum = int(wellNum)
		row = wellNum/self.cols
		if row > self.rows - 1 or row < 0:
			raise ConfigError("Wellnum is trying to specify a row outside the device's range. Wellnum: %d, row: %d"%(wellNum, row))
		col = wellNum%self.cols
		if col > self.cols - 1 or col < 0:
			raise ConfigError("Wellnum is trying to specify a col outside the device's range. Wellnum: %d, col: %d"%(wellNum, col))
		return (row, col)
		
	def RCtoWellNum(self, RC):
		'''Returns the well number of a given (row, col) position tuple.'''
		row, col = RC
		wellNum = row*self.rows + col
		if wellNum < 0 or wellNum > self.tubeNum - 1:
			raise ConfigError("RCtoWellNum is trying to return a wellNum outside the allowed range: r: %d, c: %d, wellNum: %d"%(r,c,wellNum))
		return wellNum
	
	def incrementByCol(self, wellNum, i=1, rand=False):
		'''Returns the wellNum of the next well, ordered by columns. If i!=1, returns the ith well.'''
		r,c = self.wellNumToRC(wellNum)
		r += i
		if r >= self.rows:
			c += r / self.rows
			r = r % self.rows
		if r > self.rows - 1 or r < 0:
			raise ConfigError("incrementByCol is trying to specify a row outside the device's range. Wellnum: %d, row: %d"%(wellNum, r))
		if c > self.cols - 1 or c < 0:
			raise ConfigError("incrementByCol is trying to specify a col outside the device's range. Wellnum: %d, col: %d"%(wellNum, c))
		if rand:
			wellN = self.randMatrix[self.RCtoWellNum((r,c))]
			r,c = self.wellNumToRC(wellN)
		return (r,c)
			
		
###
# Custom Exception Classes
###
class ConfigError(Exception):
	'''Configuration error.'''
	def __init__(self, mesg):
		self.mesg = mesg
	def __str__(self):
		return repr(self.mesg)
		
###
# URL to Handler mapping
###
application = webapp2.WSGIApplication([('/', MainPage),('/LPIform', FormHandler)], debug=True)