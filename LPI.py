import webapp2
import numpy as np

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
		## TO ADD:
		# Check input form data for correctness (HTML safe!)
		## --> redirect to different handler/site? Probably not.
		## Probably better to just highlight wrong input somehow
		
		# Store all device parameters from the form into a dict:
		deviceParams = {}
		
		## Pull in form data
		deviceParams['device'] = self.request.get("devices")
		deviceParams['rows'] = int(self.request.get("rows"))
		deviceParams['cols'] = int(self.request.get("columns"))
		deviceParams['channelNum'] = int(self.request.get("LEDnum"))
		
		# Pull wavelengths
		deviceParams['wavelengths'] = {}
		for i in range(deviceParams['channelNum']):
			deviceParams['wavelengths'][str(self.request.get("LED%d"%i))] = int(self.request.get("LED%d"%i))
		
		# Pull experiment time (min) -> (sec) -> (ms):
		deviceParams['totalTime'] = int(self.request.get("length")) * 60 * 1000 # millisec
		deviceParams['timeStep'] = int(float(self.request.get("timestep")) * 1000) # millisec
		
		# Randomization flag
		deviceParams['randomized'] = self.request.get("randomized")
		if deviceParams['randomized'] == '':
			deviceParams['randomized'] = False
		else:
			deviceParams['randomized'] = True
		
		# Function parameters
		deviceParams['functions'] = []
		## placeholder data:
		#deviceParams['functions'].append({'funcType':'Constant', 'startTube':0, 'orientation':'rows', 'replicates':1,'channel': 'LED0', 'intensities':[0,1,2,3,4]})
		#deviceParams['functions'].append({'funcType':'Step', 'startTube':0, 'orientation':'rows', 'replicates':1,'channel': 'LED0', 'amp': 4095,'stepTime':30, 'sampleNum':12,'sign': 'up'})
		#deviceParams['functions'].append({'funcType':'Sine', 'startTube':0, 'orientation':'rows', 'replicates':1,'channel': 'LED0', 'amp': 4095,'period':30, 'sampleNum':12,'phase': '15', 'offset':2047})
		
		constFormParams = ['funcType', 'start', 'orientation', 'replicates', 'funcWavelength', 'ints']
		stepFormParams = ['funcType', 'start', 'orientation', 'replicates', 'funcWavelength', 'amplitude', 'stepTime', 'samples', 'sign']
		sineFormParams = ['funcType', 'start', 'orientation', 'replicates', 'funcWavelength', 'amplitude', 'period', 'samples', 'phase', 'offset']
		funcFormParams = {'constant':constFormParams, 'step':stepFormParams, 'sine':sineFormParams}
		
		def pullFuncParams(params, funcNum):
			'''Takes list of func params and function number. Returns dict with func params'''
			funcParamValDict = {}
			for p in params:
				paramKey = p + '%d'%funcNum
				pval = self.request.get(paramKey)
				if p in ['funcType', 'orientation', 'sign']: # strings
					pval = str(pval)
				elif p in ['replicates', 'amplitude', 'samples', 'offset', 'funcWavelength']: # ints
					if p == 'funcWavelength':
						#pval = int(pval[-1])
						pass
					else:
						pval = int(float(pval))
				elif p in ['start', 'stepTime', 'period', 'phase']: # floats
					pval = float(pval)
				elif p == 'ints': # list of intensities
					### TO ADD: Thorough parsing & screening of input string
					intstr = pval.strip(' ').split(',')
					pval = [int(float(i)) for i in intstr]
				else:
					raise ConfigError("function key does not match known function parameters")
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
		#		raise KeyError("funcType passed does not match known function types.")
		#	func = pullFuncParams(funcFormKeys, funci)
		#	deviceParams['functions'].append(func)
		#	funci += 1		
		#
		# MUST VERIFY FUNCS REALIZABLE
		# should also check that functions don't go outside gs bounds
		## I think I can do this without looking at the max/min of gsVals by adding up all steps & other amplitudes
		## The problem is I don't know how to pull out all the functions that affect a partiuclar well
		## Also, if timing isn't taken into account, I may be too strict
		## This might be more easily done on client side....
		
		device = Device(deviceParams)
		LPFprogram = device.getProgram()
		
		# Send response
		if debug:
			self.response.headers['Content-Type'] = 'text/plain'
			self.response.write(self.request)
			self.response.write("\n\nProgram:\n")
			self.response.write(LPFprogram)
			output = "Device orientations:\n"
			#output = "%s"%deviceParams['functions']
			#for func in deviceParams['functions']:
				#output = output + "orientation: %s\n"%func['orientation']
			output += "\n\nDevice Params:\n"
			for key in deviceParams.keys():
				if key != 'functions' and key != 'randomized':
					output += "%s:\t%s\n"%(key, deviceParams[key])
			output += "\nTimes length: %d\n"%len(device.times)
			gsvalsshape = str(np.shape(device.gsVals))
			output += "gsVals shape: "+gsvalsshape+'\n'
			self.response.write(output)
		else:
			self.response.headers['Content-Type'] = 'text/plain'
			self.response.headers['Content-Disposition'] = 'attachment; filename=program.lpf'
			LPFprogram = device.getProgram()
			#fileName = device.getProgram()
			#LPFprogram = open(fileName, 'rb').readlines()[0]
			self.response.write(LPFprogram)


		
### 
# Helper (Object) Classes
###

class Device():
	'''Represents the overall device, containing a set of reaction 
	vessels (Tube objects), each of which have LEDs (Channel objects).
	The parameters (i.e. number of Tubes and Channels in each tube 
	are designed to be initialized by a config file detailing all available
	devices (which does not currently exist).
	No capability for custom device layouts has been implemented, 
	though it's a planned feature.'''
	
	def __init__(self, deviceParams):
		
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
		self.numPts = int(deviceParams['totalTime']/deviceParams['timeStep'] + 1)
		
		# set up array of time points
		self.times = np.arange(0, self.totalTime+self.timeStep, self.timeStep)
		#self.time = 0 # will be increased by timeStep each iteration
		# array of greyscale values for each tube and channel and time point
		## Indices: 0: row; 1: col; 2: channel number; 3: time point
		self.gsVals = np.zeros((self.rows, self.cols, self.channelNum, len(self.times)), dtype=np.int16)
		#self.runFunctions()
	
	def runFunctions(self):
		'''Runs all functions in self.functions and applies them to self.gsVals.'''
		for func in self.functions:
			if func['funcType'] == 'constant':
				self.constant(func)
			elif func['funcType'] == 'step':
				self.step(func)
			elif func['funcType'] == 'sine':
				self.sine(func)
			else:
				raise ConfigError("Unknown functype key passed.")
	
		
	def getProgram(self, quality='High'):
		'''Returns a string with cols as greyscale intensities for each
		channel and rows as time points. Quality can be 'Low' (for the
		simulator) or 'High' for actual programming.'''
		
		## First, make the metadata formatting bytes:
		# byte 0-3: number of (additional) header bytes
		# bytes 4-7: number of channels
		# bytes 8-11: time step size, in s
		# bytes 12-15: number of time points
		# bytes >=16: intensity values of each channel per timepoint
		# for each value, two bytes will be used as a long 16-bit int.
		
		import array as ar
		
		if quality == 'High': # writing to LPF file
			output = ar.array('h', self.gsVals.flatten())
			filename = 'testFile.lpf'
			with open(filename, 'wb') as testfile:
				output.tofile(testfile)
			
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
		
		#return output
		return fileName

	def constant(self, func):
		'''Takes existing gs values for a channel and amends a constant intensity of value 'intensity'.'''
		# determine which wells are to be modified
		startWellNum = func['start']
		# set wells to given intensities
		intensities = func['ints'] * func['replicates']
		for i, intensity in enumerate(intensities): # for each tube
			# set to desired intensity
			if func['orientation'] == 'rows':
				r,c = self.wellNumToRC(startWellNum+i)
			else:
				r,c = self.incrementByCol(startWellNum, i=i)
			w = func['funcWavelength']
			self.gsVals[r,c,w,:] = intensity

	def step(self, func):
		'''Takes existing gs values for a channel and adds/subtracts a step change in 
		gs intensity to all time points after 'stepTime' (ms) of value 'amplitude'.
		Note: amp gets ADDED to the well's previous value, instead of replacing it.
		Note: time pionts are linearly distributed starting at 'stepTime' and ending at the end of the experiment.
		NOTE: not sure how well this works for multiple steps!!'''
		# find closest index to the startTime
		startTimeIndices = [self.findIndex(i) for i in np.linspace(func['stepTime'], self.totalTime, func['samples'])][::-1] * func['replicates']
		# determine which wells are to be modified:
		startWellNum = func['start']
		# set values
		for i,timeIndex in enumerate(startTimeIndices):
			if func['orientation'] == 'rows':
				r,c = self.wellNumToRC(startWellNum+i)
			else:
				r,c = self.incrementByCol(startWellNum, i=i)
			w = func['funcWavelength']
			if func['sign'] == 'stepUp':
				self.gsVals[r,c,w,timeIndex:] = self.gsVals[r,c,w,timeIndex:] + func['amplitude']
			else:
				self.gsVals[r,c,w,timeIndex:] = self.gsVals[r,c,w,timeIndex:] - func['amplitude']

	def sine(self, func):
		'''Takes existing gs values for a channel and amends a 
		sinusoidal intensity to all time points after 'startTime' (ms)
		with amplitude 'amplitude' (gs), period 'period' (ms), y-offset of 'offset' (gs),
		and phase  shift of 'phase' (ms). 
		NOTE :the phase is SUBTRACTED (i.e. phase lag).'''
		# find remaining offset for sine wave:
		rem_offset = self.totalTime%func['period']
		# determine which wells to modify
		startWellNum = func['start']
		startTimes = np.tile(np.linspace(0,func['period'],func['samples'],endpoint=False),func['replicates'])
		# set values
		for i in range(len(startTimes)):
			if func['orientation'] == 'rows':
				r,c = self.wellNumToRC(startWellNum+i)
			else:
				r,c = self.incrementByCol(startWellNum, i=i)
			w = func['funcWavelength']
			self.gsVals[r,c,w,:] = func['amplitude'] * np.sin(2*np.pi*(self.times+startTimes[i]-rem_offset)/func['period']) + func['offset']
		
	def findIndex(self, time):
		'''Finds index of time closest to 'time' in self.times.'''
		return np.where(self.times==min(self.times, key=lambda x:abs(x-time)))[0][0]
	
	def wellNumToRC(self, wellNum):
		'''Returns the row & column position of a given well number.'''
		wellNum = int(wellNum)
		row = wellNum/self.rows
		col = wellNum%self.cols
		return (row, col)
		
	def RCtoWellNum(self, RC):
		'''Returns the well number of a given (row, col) position tuple.'''
		row, col = RC
		return row*self.rows + col
	
	def incrementByCol(self, wellNum, i=1):
		'''Returns the wellNum of the next well, ordered by columns. If i!=1, returns the ith well.'''
		r,c = self.wellNumToRC(wellNum)
		r += i
		if r >= self.rows:
			c += r / self.rows
			r = r % self.rows
		return (r,c)

	
	#~ def splitTubes(self):
		#~ '''Determines the appropriate time-shifted function parameters for each tube,
		#~ sets these values.'''
		#~ for f in self.functions:
			#~ if f['funcType'] == 'Constant':
				#~ # List of desired intensity values, repeated 'replicates' times
				#~ ints = list(f['intensities']) * f['replicates']
				#~ for i in range(len(ints)):
					
		
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
application = webapp2.WSGIApplication([('/', MainPage),('/form', FormHandler)], debug=True)