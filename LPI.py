import webapp2
import numpy as np

###
# Global Debug Parameters
debug = True
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
		## Probably better to just highlight wrong input somehow.

		if debug:
			LPFprogram = '\n\n'
			for i in np.linspace(0,10,11):
				LPFprogram += '%.2f\n'%i
		else:
			#LPFprogram = device.getProgram() ## To be added
			pass
		
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
		if debug is True:
			deviceParams['functions'] = []
			## placeholder data:
			deviceParams['functions'].append({'funcType':'Constant', 'startTube':0, 'orientation':'rows', 'replicates':1,'channel': 'LED0', 'intensities':[0,1,2,3,4]})
			deviceParams['functions'].append({'funcType':'Step', 'startTube':0, 'orientation':'rows', 'replicates':1,'channel': 'LED0', 'amp': 4095,'stepTime':30, 'sampleNum':12,'sign': 'up'})
			deviceParams['functions'].append({'funcType':'Sine', 'startTube':0, 'orientation':'rows', 'replicates':1,'channel': 'LED0', 'amp': 4095,'period':30, 'sampleNum':12,'phase': '15', 'offset':2047})
		
		# MUST VERIFY FUNCS REALIZABLE
		
		device = Device(deviceParams)
		#LPFprogram = device.getProgram()
		
		# Send response
		if debug:
			self.response.headers['Content-Type'] = 'text/plain'
			self.response.write(self.request)
			
			self.response.write(LPFprogram)
			#self.response.write("Test: %s"%self.wavelengths)
		else:
			self.response.headers['Content-Type'] = 'text/plain'
			self.response.headers['Content-Disposition'] = 'attachment; filename=program.lpf'
			#LPFprogram = device.getProgram()
			fileName = device.getProgram()
			LPFprogram = open(fileName, 'rb').readlines()[0]
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
	No capability for custom device layouts has been impoemented, 
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
		#self.times = np.arange(0, self.totalTime+self.timeStep, self.timeStep)
		self.time = 0 # will be increased by timeStep each iteration
		# array of greyscale values for each tube and channel
		## Indices: 0: row; 1: col; 2: channel number
		self.gsVals = np.zeros((self.rows, self.cols, self.channelNum), dtype=np.int16)
	
		
	def getProgram(self, quality='High'):
		'''Returns a string with cols as greyscale intensities for each
		channel and rows as time points. Quality can be 'Low' (for the
		simulator) or 'High' for actual programming.'''
		
		## First, make the metadata formatting bytes:
		# byte 0: 8 bit int with number of (additional) header bytes
		# bytes 1-4: 32-bit int with number of channels
		# bytes 5-8: 32-bit int with time step size, in ms
		# bytes 9-12: 32-bit int with number of time points
		# bytes >=13: intensity values of each channel per timepoint
		# for each value, two bytes will be used as a long 16-bit int.
		
		import io
		
		output = ''
		# byte 0:
		output += bin(12)[2:].zfill(8)
		# bytes 1-4:
		output += bin(self.channelNum*self.tubeNum)[2:].zfill(32)
		# bytes 5-8:
		output += bin(self.timeStep)[2:].zfill(32)
		# bytes 9-12:
		output += bin(self.numPts)[2:].zfill(32)
			
		# Now, add intensity values.
		## Loop through tubes, channels & pull current int val & append
		## as 16-bit int.
		## Note: should calculate all GS vals at current time point for all 
		## channels and write to file BEFORE calculating the next time
		## point to save memory.
		if quality == 'High':
			pass
			
		output = bytearray(output)
		fileName = 'testFile.txt'
		outFile = io.open(fileName, 'ab')
		buffWriter = io.BufferedWriter(outFile)
		buffWriter.write(output)
		buffWriter.close()
		
		#return output
		return fileName

	def constant(self, times, gsVals, intensity, startTime=0):
		'''Takes existing gs values for a channel and amends a 
		constant intensity to all time points after 'startTime' (ms)
		of value 'intensity'.'''
		# Make a (deep) copy - might remove later for performance
		output = empty_like(gsVals)
		output[:] = gsVals
		# find closest index to the startTime
		startIndex = self.findIndex(startTime)
		# set all intensities to their value after startTime
		output[startIndex:] = intensity
		return output

	def step(self, times, gsVals, amp, stepTime):
		'''Takes existing gs values for a channel and amends a 
		step change intensity to all time points after 'stepTime' (ms)
		of value 'amp'. Redundant with 'constant'.'''
		# Make a (deep) copy - might remove later for performance
		output = empty_like(gsVals)
		output[:] = gsVals
		# find closest index to the startTime
		startIndex = self.findIndex(stepTime)
		# set values
		output[startIndex:] = amp
		return output

	def sine(self, times, gsVals, amp, period, phase, offset, startTime):
		'''Takes existing gs values for a channel and amends a 
		sinusoidal intensity to all time points after 'startTime' (ms)
		with amplitude 'amp' (gs), period 'period' (ms), y-offset of 'offset' (gs), and 
		phase  shift of 'phase' (ms). 
		NOTE :the phase is SUBTRACTED (i.e. phase lag).'''
		# Make a (deep) copy - might remove later for performance
		output = empty_like(gsVals)
		output[:] = gsVals
		# find closest index to the startTime
		startIndex = self.findIndex(startTime)
		startTime = times[startIndex]
		phase = phase/float(period)*2*np.pi
		# set values
		output[startIndex:] = amp*np.sin(2*np.pi*(times[startIndex:]-startTime)/float(period) - phase) + offset
		return output
		
	def findIndex(self, time):
		'''Finds index of time closest to 'time' in self.times.'''
		return np.where(self.times==min(self.times, key=lambda x:abs(x-time)))[0][0]
	
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