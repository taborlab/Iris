import webapp2
import numpy as np

###
# Global Debug Parameters
debug = True
###

###
# HTML For Main Page (webform)
###
form = '''
<!DOCTYPE html>

<html lang="en">
    <head>
        <meta charset="utf-8" />
        <title></title>
        <link rel="stylesheet" href="css/StyleSheet.css">
    </head>
    <body>
        <div id="container">
            <form method="post" id="LPFform" action="/form">
                <fieldset>
                    <legend>Light Device Specifications</legend>
                    <ol id="LDSpecs">
                        <li id="devicesli">
                            <select id = "devices" name="devices">
                                <option value = "LTA">Light Tube Array</option>
                                <option value = "LPA">Light Plate Apparatus</option>
                                <option value = "ASS">Action Spectrum Sampler</option>
                                <option value="custom">Custom Configuration</option>
                            </select>
                        </li>
                        <li><label for="rows">Number of rows</label><input id="rows" type="number" name="rows" value="8" min ="1" max="12" /></li>
                        <li><label for="columns">Number of columns</label><input id="columns" type="number" name="columns" value="12"min="1" max="12" /></li>
                        <li><label for="LEDnum">Number of LEDs</label><input id="LEDnum" type ="number" name="LEDnum" value="1" min="1" max="4" /></li>
                        <li>
                            <fieldset>
                                <legend>LED Specifications</legend>
                                <ol id="LEDs">
                                    <li class="template">
                                        <label  for="LED">Wavelength</label> <input class="LED" type="number" name="wavelength" value="0" min="0"/>
                                    </li>
                                </ol>
                            </fieldset>
                        </li>
                    </ol>
                </fieldset>
                <fieldset>
                    <legend>Light Program Specifications</legend>
                    <ol id="LPSpecs">
                        <li><label for="length">Length of run (minutes)</label><input id="length" type="number" name="length" min="0"/></li>
                        <li><label for="timestep">Timestep of run (seconds)</label><input id="timestep" type ="number" name="timestep" min="0" step="0.01"/></li>
                        <li><label for="randomized">Randomize the positions</label><input id="randomized" type="checkbox" name="randomized" value="randomized"/></li>
                        <li><input id="constButt" type="button" value="Add Constant Function"/></li>
                        <li><input id="stepButt" type="button" value="Add Step Function"/></li>
                        <li><input id="sineButt" type="button" value="Add Sine Wave Function"/></li>
                        <li class="func const template">
                            <fieldset>
                                <legend>Constant Input Function</legend>
                                <ol>
                                    <li><label class="start">Starting position</label><input class="start" type="number" value="1" min="1"/></li>
                                    <li>
                                        <fieldset class="radio">
                                            <legend>Orientation</legend>
                                            <input class="RC" type="radio" checked="checked"/><label class="RC">Rows then Columns</label>
                                            <input class="CR" type="radio"/><label class="CR">Column then Rows</label>

                                        </fieldset>
                                    </li>
                                    <li><label class="replicates"># of Replicates</label><input class="replicates" type="number" value="1" min="1"/></li>
                                    <li><label for="funcWavelength">For wavelength</label>
                                        <select class = "funcWavelength" name="funcWavelength">
                                        </select>
                                    </li>
                                    <li><label class="ints">Comma seperated list of intensities</label><input class="ints" type="text" placeholder="0,50,100,4095"/></li>
                                    <li><input class="close" type = "button" value="Close"/></li>
                                </ol>
                            </fieldset>
                        </li>
                        <li class="func step template">
                            <fieldset>
                                <legend>Step Input Function</legend>
                                <ol>
                                    <li><label class="start">Starting position</label><input class="start" type="number" value="1" min="1"/></li>
                                    <li>
                                        <fieldset class="radio">
                                            <legend>Orientation</legend>
                                            <ol>
                                                <li><input class="RC" type="radio" checked="checked"/><label class="RC">Rows then Columns</label></li>
                                                <li><input class="CR" type="radio"/><label class="CR">Column then Rows</label></li>
                                            </ol>
                                        </fieldset>
                                    </li>
                                    <li><label class="replicates"># of Replicates</label><input class="replicates" type="number" value="1" min="1"/></li>
                                        <li><label for="funcWavelength">For wavelength</label>
                                        <select class = "funcWavelength" name="funcWavelength">
                                        </select>
                                    </li><li><label class="amplitude">Amplitude of Step</label><input class="amplitude" type="number" value="4095" min="0" /></li>
                                    <li><label class="stepTime">Time into run at which step occurs</label><input class="stepTime" type="number" value="0" min="0" /></li>
                                    <li><label class="samples"># of evenly spaced samples to take</label><input class="samples" type="number" value="1" min="1" /></li>
                                    <li>
                                        <fieldset class="radio">
                                            <legend>Sign</legend>
                                            <ol>
                                                <li><input class="stepUp" type="radio" checked="checked"/><label class="stepUp">Step Up</label></label></li>
                                                <li><input class="stepDown" type="radio" /><label class="stepDown">Step Down</label></li>
                                            </ol>
                                        </fieldset>
                                    </li>
                                    <li><input class="close" type ="button" value="Close"/></li>
                                </ol>
                            </fieldset>
                        </li>
                        <li class="func sine template">
                            <fieldset>
                                <legend>Sine Wave Input Function</legend>
                                <ol>
                                    <li><label class="start">Starting position</label><input class="start" type="number" value="1" min="1"/></li>
                                    <li>
                                        <fieldset class="radio">
                                            <legend>Orientation</legend>
                                            <ol>
                                                <li><input class="RC" type="radio"checked="checked"/><label class="RC">Rows then Columns</label></li>
                                                <li><input class="CR" type="radio"/><label class="CR">Column then Rows</label></li>
                                            </ol>
                                        </fieldset>
                                    </li>
                                    <li><label class="replicates"># of Replicates</label><input class="replicates" type="number" value="1" min="1"/></li>
                                    <li><label for="funcWavelength">For wavelength</label>
                                        <select class = "funcWavelength" name="funcWavelength">
                                        </select>
                                    </li><li><label class="samples"># of evenly spaced samples to take</label><input class="samples" type="number" value="1" min="1" /></li>
                                    <li><label class="amplitude">Amplitude of Wave</label><input class="amplitude" type="number" value="2047" min="0" /></li>
                                    <li><label class="period">Period of Wave (minutes)</label><input class="period" type="number" value="0" min="0" /></li>
                                    <li><label class="phase">Phase of Wave (minutes)</label><input class="phase" type="number" value="0" min="0" /></li>
                                    <li><label class="offset">Verticle offset of Wave</label><input class="offset" type="number" value="2047" min="0" /></li>
                                    <li><input class="close" type ="button" value="Close"/></li>
                                </ol>
                            </fieldset>
                        </li>
                    </ol>
                </fieldset>
                <fieldset>
		            <button type=submit>Submit</button>
	            </fieldset>
            </form>
            <div id="visualizationContainer">
            <div id="visualization">
                <div id="SimControl">
                    <label for="timestep">Timestep (s)</label><input id="timestep" type="number" value="1" min="0" />
                    <input type ="button" value="Generate file (10mb)"/>
                    <br/>
                    <input type ="button" value="Simulation"/>
                    <label for="speed">Speed</label><input id="speed" type="range" min="0" max="1" step="0.1" value="0.5" />
                    <label for="SimWell">Well (R,C)</label><input id="SimWell" type="text" value="1,1"/>
                    <input type="button" value="run"/>
                </div>
                <div id="simulation">
                    <canvas></canvas>
                </div>
                </div>
            </div> 
        </div>
        <script src="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js"></script>
        <script src="js/form.js"></script>
        <script src="js/visualization.js"></script>
    </body>
</html>
'''

# This doesn't work... need to use other package to do this
# index = open('index.html', 'r')
# form = index.readlines().strip('\n')


###
# Server Request Handlers
###

class MainPage(webapp2.RequestHandler):
	def get(self):
		# Normal Get requests to the main page return the webform:
		self.response.headers['Content-Type'] = 'text/html'
		self.response.write(form)

class FormHandler(webapp2.RequestHandler):
	# The submit button on the main page passes a Post request with the form data:
	def post(self):
		## TO ADD:
		# Check input form data for correctness
		## --> redirect to different handler/site? Probably not.
		
		if debug:
			LPFprogram = '\n\n'
			for i in np.linspace(0,10,10):
				LPFprogram += '%.2f\n'%i
		else:
			#LPFprogram = device.getProgram() ## To be added
			pass
		
		## Pull in form data
		self.device = self.request.get("devices")
		self.rows = int(self.request.get("rows"))
		self.cols = int(self.request.get("columns"))
		self.channelNum = int(self.request.get("LEDnum"))
		
		# Pull wavelengths
		self.wavelengths = {}
		for i in range(self.channelNum):
			self.wavelengths[str(self.request.get("LED%d"%i))] = int(self.request.get("LED%d"%i))
		
		# Pull experiment time (min) -> (sec) -> (ms):
		self.totalTime = int(self.request.get("length")) * 60 * 1000 # millisec
		self.timeStep = float(self.request.get("timestep")) * 1000 # millisec
		
		# Randomization flag
		self.randomized = self.request.get("randomized")
		if self.randomized == '':
			self.randomized = False
		else:
			self.randomized = True
		
		# Function parameters
		if debug:
			self.functions = []
			## placeholder data:
			self.functions.append({'funcType':'Constant', 'startTube':0, 
							   'orientation':'rows', 'replicates':1,
							   'channel': 'LED0', 'intensities':[0,1,2,3,4]})
			self.functions.append({'funcType':'Step', 'startTube':0, 
							   'orientation':'rows', 'replicates':1,
							   'channel': 'LED0', 'amp': 4095,
							   'stepTime':30, 'sampleNum':12,
							   'sign': 'up'})
			self.functions.append({'funcType':'Sine', 'startTube':0, 
							   'orientation':'rows', 'replicates':1,
							   'channel': 'LED0', 'amp': 4095,
							   'period':30, 'sampleNum':12,
							   'phase': '15', 'offset':2047})
		
		# Send response
		if debug:
			self.response.headers['Content-Type'] = 'text/plain'
			self.response.write(self.request)
			self.response.write(LPFprogram)
			self.response.write("Test: %s"%self.wavelengths)
		else:
			self.response.headers['Content-Type'] = 'text/plain'
			self.response.headers['Content-Disposition'] = 'attachment; filename=program.lpf'
			
			self.response.write(LPFprogram)


		
### 
# Helper (Object) Classes
###

class Device():
	'''Represents the overall device, containing a set of reaction 
	vessels (Tube objects), each of which have LEDs (Channel objects).
	The parameters (i.e. number of Tubes and Channels in each tube 
	are designed to be initialized by a config file detailing all available
	devices (which does not currently exist.'''
	
	# For now, hard-code an LTA layout with and 8x8x4 array:
	def __init__(self, deviceName):
		
		try:
			self.configureDevice()
		except ConfigError as e:
			print e
	
	def configureDevice(self, deviceName):
		'''Pulls device information from the devices.config file.'''
		path = 'config/devices.config'
		devicesFile = open(path, 'rt')
		inHeader = True # Current line in metadata
		inBody = False # In list of devices
		inDevice = False # In desired device
		inChannels = False
		self.channelNames = []
		
		self.deviceName = None
		
		for line in devicesFile:
			line = line.strip('\n').split('\t')
			if inHeader:
				if 'DEVICE' in line:
					inHeader = False
					inBody = True
			if inBody:
				if 'NAME' in line:
					if deviceName == line[1]:
						self.deviceName = line[1]
						inDevice = True
			if inDevice:
				if 'CHANNELS' in line:
					inChannels = True
					continue
				if inChannels:
					if line[0] == '':
						self.channelNames.append((line[1], line[2]))
					else:
						inChannels = False
				if 'NOTES' in line:
					self.notes = line[1]
					break
				if 'TYPE' in line:
					self.type = line[1]
				if 'ROWS' in line:
					self.rows = int(line[1])
				if 'COLS' in line:
					self.cols = int(line[1])
				self.tubeNum = self.rows * self.cols
				if 'MIN REFRESH TIME' in line:
					self.timeStep = int(line[1])*1000 #millisec
				if 'MAX EXPERIMENT TIME' in line:
					self.experimentTime = int(line[1]) #sec
		
		self.channelNum = len(self.channelNames)
		if self.channelNum <= 0:
			# Channels not parsed correctly...
			raise ConfigError("Must be >= 1 channel!")
		
		self.numPts = int(self.experimentTime / (self.timeStep / 1000))

		if self.deviceName is None:
			# No device found in config file!
			raise ConfigError("Device name not found in devices.config.")
		devicesFile.close()
		
		## TO ADD:
		# Initialize Tube & Channel objects
		
	def getProgram(self, quality='High'):
		'''Returns a string with cols as greyscale intensities for each
		channel and rows as time points. Quality can be 'Low' (for the
		simulator) or 'High' for actual programming.'''
		
		## First, make the metadata formatting bytes:
		# byte 0: 8 bit int with number of header bytes
		# bytes 1-4: 32-bit int with number of channels
		# bytes 5-8: 32-bit int with time step size, in ms
		# bytes 9-12: 32-bit int with number of time points
		# bytes >=13: intensity values of each channel per timepoint
		# for each value, two bytes will be used as a long 16-bit int.
		
		if quality == 'High':
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
		
		return output

	def constant(self, times, gsVals, intensity, startTime=0):
		'''Takes existing gs values for a channel and amends a 
		constant intensity to all time points after 'startTime' (ms)
		of value 'intensity'.'''
		# Make a (deep) copy - might remove later for performance
		output = empty_like(gsVals)
		output[:] = gsVals
		# find closest index to the startTime
		startIndex = np.where(times==min(times, key=lambda x:abs(x-startTime)))[0][0]
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
		startIndex = np.where(times==min(times, key=lambda x:abs(x-stepTime)))[0][0]
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
		startIndex = np.where(times==min(times, key=lambda x:abs(x-startTime)))[0][0]
		startTime = times[startIndex]
		phase = phase/float(period)*2*np.pi
		# set values
		output[startIndex:] = amp*np.sin(2*np.pi*(times[startIndex:]-startTime)/float(period) - phase) + offset
		return output

		
###
# Custom Exception Classes
###
class ConfigError(Exception):
	def __init__(self, mesg):
		self.mesg = mesg
	def __str__(self):
		return repr(self.mesg)
		
###
# URL to Handler mapping
###
application = webapp2.WSGIApplication([
    ('/', MainPage),
	('/form', FormHandler)
], debug=True)