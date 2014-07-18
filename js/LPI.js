function LPFEncoder () {
    // default device params for drawing initial plate
    this.rows = 8;
    this.cols = 8;
    this.tubeNum = this.cols * this.rows;
    this.channelNum = 4;
    this.totalTime = 1000; //ms
    this.timeStep = 1000; //ms
    this.numPts = Math.floor(this.totalTime/this.timeStep + 1);
    this.maxGSValue = 4095;
    this.times = new Array(this.numPts);
    for (i=0; i<this.times.legnth; i++) {
        this.times[i] = this.timeStep * i;
    }
    this.randomized = false;
    
    // create intensities array & initialize all values to 0
    // Can probably remove the header here for initialization. Don't think it matters.
    this.buff = new ArrayBuffer(32 + 2*this.tubeNum * this.channelNum * this.numPts);
    
    this.header = new Uint32Array(this.buff,0,8);
    this.header[0] = 1; // FILE_VERSION = 1.0
    this.header[1] = this.tubeNum * this.channelNum; // NUMBER_CHANNELS
    this.header[2] = this.timeStep; // STEP_SIZE
    this.header[3] = this.numPts; // NUMBER_STEPS
    // remaining header bytes are left empty
	
    this.intensities = new Uint16Array(this.buff, 32);
    for (i=0; i<this.intensities.length;i++) {
	//this.intensities[i] = 0;
	// initialize to random values for testing (0-4095)
	this.intensities[i] = Math.floor(Math.random()*this.maxGSValue);
    }
    
    //////////////////
    // pull device params from form
    // NEED TO CLEAN THESE!!
    //////////////////
    this.pullData = function () {
	this.rows = $("#rows").val();
	this.cols = $("#columns").val();
	this.tubeNum = this.rows * this.cols;
	this.channelNum = $("#LEDnum").val();
	this.totalTime = $("#length").val() * 60 * 1000; // in ms
	this.timeStep = $("#timestep").val() * 1000; // in ms
	this.numPts = Math.floor(this.totalTime/this.timeStep + 1);
	this.maxGSValue = 4095;
	this.times = new Array(this.numPts);
	for (i=0; i<this.times.legnth; i++) {
	    this.times[i] = this.timeStep * i;
	}
	this.randomized = document.getElementById("randomized").checked;
	this.stepInIndex = this.tubeNum * this.channelNum;
	this.timePoints = numeric.rep([this.tubeNum],-1); // initialize array containing the time points for each tube
	    // NOTE: The indices for these tubes are according to the randomization matrix!!
	    // NOTE: A time of -1 indicates that it was never set; will be changed before writing.
	    // Should check that it's not somehow set more than once!! (right?)
	
	///////////////////    
	// Deal with randomization
	// shuffle function for randomizing the randMatrix
	function shuffleArray(array) {
	    for (var i = array.length - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	    }
	    return array;
	};
	this.randMatrix = new Array(this.tubeNum);
	for (i=0; i<this.tubeNum; i++) {
	    this.randMatrix[i] = i;
	}
	if (this.randomized == true) { // randMatrix must be shuffled
	    this.randMatrix = shuffleArray(this.randMatrix);
	}
	
	////////////////////
	// Initialize Intensities
	////////////////////
	// create intensities array & initialize all values to 0
	this.buff = new ArrayBuffer(32 + 2*this.tubeNum * this.channelNum * this.numPts);
    
	this.header = new Uint32Array(this.buff,0,8);
	this.header[0] = 1; // FILE_VERSION = 1.0
	this.header[1] = this.tubeNum * this.channelNum; // NUMBER_CHANNELS (TOTAL number, not per well)
	this.header[2] = this.timeStep; // STEP_SIZE
	this.header[3] = this.numPts; // NUMBER_STEPS
	// remaining header bytes are left empty
	    
	this.intensities = new Uint16Array(this.buff, 32);
	for (i=0; i<this.intensities.length;i++) {
	    this.intensities[i] = 0;
	    //this.intensities[i] = Math.floor(Math.random()*this.maxGSValue);
	}
	
	///////////////
	// Placeholder functions for program
	this.functions = [];
	///////////////
    };
    
    this.getCurrentIntensities = function(currentStep) {
	var subArr = this.intensities.subarray(currentStep*this.stepInIndex, (currentStep+1)*this.stepInIndex);
	var intensityStep = new Array(this.rows);
	for (var r=0;r<this.rows;r++) {
	    for (var c=0;c<this.cols;c++) {
		if (c==0) {
		    intensityStep[r] = new Array(this.cols);
		}
		var wellNum = r*8+c;
		for (var channelIndex=0;channelIndex<this.channelNum;channelIndex++) {
		    if (channelIndex==0) {
			intensityStep[r][c] = new Array(this.channelNum)
		    }
		    intensityStep[r][c][channelIndex] = subArr[wellNum*this.channelNum + channelIndex]
		}
	    }
	}
	
	return intensityStep;
    };
    
    // function: pull & parse all function inputs
    this.parseFunctions = function () {
	var funcNum = 0;
	var funcType = $("#funcType"+funcNum).val();
	while (funcType != undefined) {
	    if (funcType == 'constant') {
		this.functions[funcNum] = new ConstantFunction(funcNum, this);
	    }
	    else if (funcType == 'step') {
		this.functions[funcNum] = new StepFunction(funcNum, this);	
	    }
	    else if (funcType == 'sine') {
		this.functions[funcNum] = new SineFunction(funcNum, this);
	    }
	    else if (funcType == 'arb') {
		this.functions[funcNum] = new ArbFunction(funcNum, this);
	    }
	    
	    funcNum += 1;
	    funcType = $("#funcType"+funcNum).val();
	}
	console.log("Function number: " + funcNum);
    };
    
    // function: calculate maximum time step
	// Calculates the largest time step (ms) possible for program to minimize file size & computational effort
    this.calcMaxTimeStep = function () {
	return 1000; // ms
    };
    
    // function: run functions, modify intensities as appropriate
    this.runFunctions = function () {
	//for (f in this.functions) {
	for (i=0;i<this.functions.length;i++) {
	    this.functions[i].runFunc();
	}
    };
	
    this.writeLPF = function() {
	// Saves the buffer (this.buff) which contains the header and the intensity array
	//saveAs(new Blob([this.buff], {type: "LPF/binary"}), "testfile.lpf");
	
	// Make CSV with randomization matrix & time points
	var CSVStr = "Well Number," + "Randomized Index," + "Time Points" + "\n";
	for (i=0;i<this.tubeNum;i++) {
	    var tp;
	    if (this.timePoints[i] == -1) {
		// time Point was unset. Set to final time in run.
		tp = this.totalTime;
	    }
	    else {
		tp = this.timePoints[i];
	    }
	    var row = i + "," + this.randMatrix[i] + "," + tp + "\n";
	    CSVStr += row;
	}
	saveAs(new Blob([CSVStr], {type: "text/csv"}), "randomizationMatrix.csv");
    };

};

function ConstantFunction (funcNum, parentLPFE) {
  // Constant input function
  this.funcType = 'constant';
  this.funcNum = funcNum;
  this.start = $("#start"+funcNum).val() - 1; // convert to base 0 numbers
  this.orientation = $('input[id=RC'+funcNum+']:checked').val();
  if (this.orientation==undefined) {
    this.orientation = 'col';
  }
  this.replicates = $("#replicates"+funcNum).val();
  //this.channel = $("#funcWavelength"+funcNum+" option:selected").text();
  this.channel = $("#funcWavelength"+funcNum).val();
  // Channel is definitely broken.
  this.channel = 0; // FOR TESTING
  
  // INTS NEED TO BE CLEANED!
  this.ints = $("#ints"+funcNum).val();
  this.ints = JSON.parse("[" + this.ints + "]");
  for (i=0;i<this.ints.length;i++) {
    if (this.ints[i] % 1 != 0) {
	// intensity is not whole number
	this.ints[i] = Math.round(this.ints[i]);
    }
  }
  
  // Write new well intensities
  this.runFunc = function () {
    var intsRepd = repeatArray(this.ints, this.replicates*this.ints.length);
    for (tube_i=0;tube_i<intsRepd.length;tube_i++) {
	if (this.orientation == 'row') {
	    var startIntIndex = this.getIntIndex(0,parentLPFE.randMatrix[this.start+tube_i],this.channel);
	}
	else if (this.orientation == 'col') {
	    var startIntIndex = this.getIntIndex(0,incrememntByCol(this.start,tube_i,parentLPFE.rows,parentLPFE.cols,parentLPFE.randMatrix),this.channel);
	}
	for (time_i=0;time_i<parentLPFE.numPts;time_i++) {
	    parentLPFE.intensities[startIntIndex + parentLPFE.stepInIndex * time_i] = intsRepd[tube_i];
	}
    }
  };
  
  this.getIntIndex = function (timeIndex, wn, channel) {
    // returns the index of the desired intensity value
    return parentLPFE.stepInIndex * timeIndex + wn*parentLPFE.channelNum + channel;
  };
};

function StepFunction (funcNum, parentLPFE) {
  // Constant input function
  this.funcType = 'step';
  this.funcNum = funcNum;
  this.start = $("#start"+funcNum).val() - 1; // convert to base 0 numbers
  this.orientation = $('input[id=RC'+funcNum+']:checked').val();
  if (this.orientation==undefined) {
    this.orientation = 'col';
  }
  this.replicates = $("#replicates"+funcNum).val();
  //this.channel = $("#funcWavelength"+funcNum+" option:selected").text();
  //this.channel = $("#funcWavelength"+funcNum).val();
  // Channel is definitely broken.
  this.channel = 0; // FOR TESTING
  
  this.amplitude = $("#amplitude"+funcNum).val(); // GS
  this.stepTime = $("#stepTime"+funcNum).val() * 60 * 1000; // ms
  this.samples = $("#samples"+funcNum).val(); // num
  this.sign = $('input[id=stepUp'+funcNum+']:checked').val(); // 'stepUp' vs 'stepDown'
  if (this.sign == undefined) {
    this.sign = 'stepDown';
  }
  
  // Write new well intensities
  this.runFunc = function () {
    console.log("testing getting index: " + Array.apply([],parentLPFE.intensities.subarray(0,40)).toString());
    var timePoints = repeatArray(numeric.linspace(this.stepTime, parentLPFE.totalTime, this.samples), this.samples*this.replicates);
    for (i=0;i<timePoints.length;i++) {
	var startTimeIndex = findClosestTime(timePoints[i], parentLPFE.times);
	if (this.orientation == 'row') {
	    var wellNum = parentLPFE.randMatrix[this.start+i];
	}
	else {
	    var wellNum = incrememntByCol(this.start,i,parentLPFE.rows,parentLPFE.cols,parentLPFE.randMatrix);
	}
	parentLPFE.timePoints[wellNum] = timePoints[i];
	var startIntIndex = this.getIntIndex(startTimeIndex, wellNum, this.channel);
	if (this.sign == 'stepUp') {
	    for (time_i=startTimeIndex;time_i<parentLPFE.numPts;time_i++) {
		ind = startIntIndex + parentLPFE.stepInIndex * (time_i - startTimeIndex);
		parentLPFE.intensities[ind] = parentLPFE.intensities[ind] + this.amplitude;
	    }
	}
	else {
	    for (time_i=startTimeIndex;time_i<parentLPFE.numPts;time_i++) {
		var ind = startIntIndex + parentLPFE.stepInIndex * (time_i - startTimeIndex);
		parentLPFE.intensities[ind] = parentLPFE.intensities[ind] - this.amplitude;
	    }
	}
    }
  };
  
  this.getIntIndex = function (timeIndex, wn, channel) {
    // returns the index of the desired intensity value
    return parentLPFE.stepInIndex * timeIndex + wn*parentLPFE.channelNum + channel;
  };
};

function SineFunction (funcNum, parentLPFE) {
  // Constant input function
  this.funcType = 'sine';
  this.funcNum = funcNum;
  this.start = $("#start"+funcNum).val() - 1; // convert to base 0 numbers
  this.orientation = $('input[id=RC'+funcNum+']:checked').val();
  if (this.orientation==undefined) {
    this.orientation = 'col';
  }
  this.replicates = $("#replicates"+funcNum).val();
  //this.channel = $("#funcWavelength"+funcNum+" option:selected").text();
  //this.channel = $("#funcWavelength"+funcNum).val();
  // Channel is definitely broken.
  this.channel = 0;
  
  this.amplitude = $("#amplitude"+funcNum).val() * 1; // GS
  this.period = $("#period"+funcNum).val() * 60 * 1000; // ms
  this.samples = $("#samples"+funcNum).val() * 1; // number
  this.phase = $("#phase"+funcNum).val() * 60 * 1000; // ms
  this.offset = $("#offset"+funcNum).val() * 1; // GS
  
  // Write new well intensities
  this.runFunc = function () {
    console.log("testing getting index: " + Array.apply([],parentLPFE.intensities.subarray(0,40)).toString());
    var rem_offset = parentLPFE.totalTime % this.period;
    var startTimes = repeatArray(numeric.linspace(0,this.period,this.samples+1).slice(0,-1), this.samples*this.replicates);
    
    for (i=0;i<startTimes.length;i++) {
	var startTimeIndex = 0;
	if (this.orientation == 'row') {
	    var wellNum = parentLPFE.randMatrix[this.start+i];
	}
	else {
	    var wellNum = incrememntByCol(this.start,i,parentLPFE.rows,parentLPFE.cols,parentLPFE.randMatrix);
	}
	parentLPFE.timePoints[wellNum] = startTimes[i];
	var startIntIndex = this.getIntIndex(startTimeIndex, wellNum, this.channel);
	for (time_i=startTimeIndex;time_i<parentLPFE.numPts;time_i++) {
	    var ind = startIntIndex + parentLPFE.stepInIndex * (time_i - startTimeIndex);
	    var t = parentLPFE.times[time_i] + startTimes[i] - rem_offset;
	    parentLPFE.intensities[ind] = this.amplitude * Math.sin(2*Math.PI*t/this.period - this.phase) + this.offset;
	}
    }
  };
  
  this.getIntIndex = function (timeIndex, wn, channel) {
    // returns the index of the desired intensity value
    return parentLPFE.stepInIndex * timeIndex + wn*parentLPFE.channelNum + channel;
  };
};

function ArbFunction (funcNum, parentLPFE) {
  // Constant input function
  this.funcType = 'sine';
  this.funcNum = funcNum;
  this.start = $("#start"+funcNum).val() - 1; // convert to base 0 numbers
  this.orientation = $('input[id=RC'+funcNum+']:checked').val();
  if (this.orientation==undefined) {
    this.orientation = 'col';
  }
  //this.channel = $("#funcWavelength"+funcNum+" option:selected").text();
  this.channel = $("#funcWavelength"+funcNum).val();
  // Channel is definitely broken.
  
  this.precondition = $("#precondition"+funcNum).val(); // GS
  this.stepTimes = $("#stepTimes"+funcNum).val(); // array, min
  this.stepTimes = JSON.parse("[" + this.stepTimes + "]");
  for (i=0;i<this.stepTimes.length;i++) {
    if (this.stepTimes[i] % 1 != 0) {
	// intensity is not whole number
	this.stepTimes[i] = Math.round(this.stepTimes[i]);
    }
  }
  this.stepValues = $("#stepValues"+funcNum).val(); // array, GS
  this.stepValues = JSON.parse("[" + this.stepValues + "]");
  for (i=0;i<this.stepValues.length;i++) {
    if (this.stepValues[i] % 1 != 0) {
	// intensity is not whole number
	this.stepValues[i] = Math.round(this.stepValues[i]);
    }
  }
  this.timePoints = $("#timePoints"+funcNum).val(); // array, min
  this.timePoints = JSON.parse("[" + this.timePoints + "]");
  for (i=0;i<this.timePoints.length;i++) {
    if (this.timePoints[i] % 1 != 0) {
	// intensity is not whole number
	this.timePoints[i] = Math.round(this.timePoints[i]);
    }
  }
  
  // Write new well intensities
  this.runFunc = function () {
    console.log("testing getting index: " + Array.apply([],parentLPFE.intensities.subarray(0,40)).toString());
    var stepTimeInds = []
    for (i=0;i<this.stepTimes.length;i++) {
	stepTimeInds[i] = findClosestTime(this.stepTimes[i], parentLPFE.times);
    }
    var tTimeInds = []
    for (i=0;i<this.timePoints.length;i++) {
	tTimeInds[i] = findClosestTime(this.timePoints[i], parentLPFE.times);
    }
    var tShiftInds = []
    for (i=0;i<this.timePoints.length;i++) {
	tShiftInds[i] = findClosestTime(parentLPFE.totalTime - this.timePoints[i], parentLPFE.times);
    }
    
    // make a tube that is not time-shifted
    var unshifted = new Array(parentLPFE.numPts);
    for (i=0;i<this.stepTimes.length+1;i++) {
	if (i==0) {
	    for (j=0;j<stepTimeInds[i];j++) {
		unshifted[j] = this.precondition;
	    }
	}
	else if (i>0 && i<this.stepTimes.length) {
	    for (j=stepTimeInds[i-1];j<stepTimeInds[i];j++) {
		unshifted[j] = this.stepValues[i-1];
	    }
	}
	else {
	    for (j=stepTimeInds[i-1];j<unshifted.length;j++) {
		unshifted[j] = this.stepValues[this.stepValues.length-1];
	    }
	}
    }
    for (i=this.timePoints.length-1;i>=0;i--) {
	if (this.orientation == 'row') {
	    var wellNum = parentLPFE.randMatrix[this.start+i];
	}
	else {
	    var wellNum = incrememntByCol(this.start,i,parentLPFE.rows,parentLPFE.cols,parentLPFE.randMatrix);
	}
	parentLPFE.timePoints[wellNum] = this.timePoints[i];
	if (i-this.timePoints.length-1 == 0 && parentLPFE.totalTime-this.timePoints[i] == 0) {
	    // first tube, unshifted
	    var startIntIndex = this.getIntIndex(0, wellNum, this.channel);
	    for (time_i=0;time_i<parentLPFE.numPts;time_i++) {
		var ind = startIntIndex + parentLPFE.stepInIndex * time_i;
		parentLPFE.intensities[ind] = unshifted[time_i];
	    }
	}
	else {
	    var startIntIndex = this.getIntIndex(0, wellNum, this.channel);
	    for (time_i=0;time_i<parentLPFE.numPts;time_i++) {
		var ind = startIntIndex + parentLPFE.stepInIndex * time_i;
		if (time_i<tShiftInds[i]) {
		    parentLPFE.intensities[ind] = this.precondition;
		}
		else {
		    var unshiftedIndex = tShiftInds[i]-time_i;
		    parentLPFE.intensities[ind] = unshifted[unshiftedIndex];
		}
	    }
	}
    }
  };
  
  this.getIntIndex = function (timeIndex, wn, channel) {
    // returns the index of the desired intensity value
    return parentLPFE.stepInIndex * timeIndex + wn*parentLPFE.channelNum + channel;
  };
};

function repeatArray(value, len) {
	var arr = [];
	for (var i = 0; i < len; i++) {
	    arr.push(value[i%value.length]);
    };
  return arr;
};

function incrememntByCol(wellNum, num, rows, cols, randMat) {
    // Incrememnts wellNum (index) by column, not by row, 'num' tubes
    // returns the new wellNum
    //rand = typeof rand !== 'undefined' ? a : false; // rand set to false by default
    r = Math.floor(wellNum/cols);
    c = wellNum % cols;
    r += num;
    if (r>rows) {
	c += Math.floor(r/rows);
	r = r % rows;
    }
    var wn = r*rows+c;
    return randMat[wn];
};

function findClosestTime(time, timesArray) {
    // finds the index of the time in timesArray closest to 'time' using a binary search
    var lowi = -1;
    var highi = timesArray.length;
    while (highi - lowi > 1) {
	var midi = Math.round((lowi+highi)/2);
	if (timesArray[midi] == time) {
	    return midi;
	}
	else if (timesArray[midi] < time) {
	    lowi = midi;
	}
	else {
	    highi = midi;
	}
    }
    if (timesArray[lowi]==time) {
	return lowi;
    }
    else if (timesArray[highi] - time < time - timesArray[lowi]) {
	return highi;
    }
    else {
	return lowi;
    }
};

var LPI = (function () {
    var canvas = document.getElementsByTagName('canvas');
    var context = canvas[0].getContext('2d');
    context.globalCompositeOperation = 'lighter';
    var simulationManager = (function () {
        var plateManager = (function () {
	    // LPF encoder holds all the intensities and device variables.
	    // It also parses the input functions, updates the intensities, and writes the output file.
	    var encoder = new LPFEncoder();
	    
	    // Listen for 'Submt' click --> on click, calculate output & serve file
	    $("#submit").click(function () {
		var startTimer = new Date().getTime();
		// read current inputs
		encoder.pullData();
		// calculate function output
		encoder.parseFunctions();
		encoder.runFunctions();
		//console.log("testing getting index: " + Array.apply([],encoder.intensities.subarray(0,40)).toString());
		//console.log("Numeric test: " + numeric.linspace(0,63,64));
		// make file
		// write file
		encoder.writeLPF();
		var endTimer = new Date().getTime();
		var elapsedTime = endTimer - startTimer;
		console.log("Elapsed time: " + elapsedTime)
	    });
	    
	    // TO BE ADDED:
	    // listener for 'Simulate' button
	    // causes same steps as 'Submit', but doesn't generate file.
	    // Might actually want to make 'Download' a different button that's only clickable after 'Simulate'
	    
	    // derived vars
            var timesteps = encoder.numPts;
            var currentStep = 0;
            var interval = 200; //refresh rate in milliseconds         
            
            //Gets the amount of steps that should be advanced each interval
	    // LAH: I assume this willbe updated later to allow speeding up simulation playback?
            function getStepMagnitude() {
                return 1;
            }
            
            //Gets the maximum number of steps of the simulation
            function getMaxSteps() {
                return encoder.numPts - 1;
            }
            
            //Starts playing the well simulation from the current time
            //If the full simulation just played restart it
            function playWellSim() {
                //If stopped at end of run, restart
                if (currentStep >= getMaxSteps()) {
                    currentStep = 0;
                    updateTime(currentStep / getMaxSteps());
                }
                intervalFunc = setInterval(timestep, interval);
            }
            
            //Pauses the well simulation
            function pauseWellSim() {
                clearInterval(intervalFunc);
            }
            
            //Increments the well simulation one timestep
            function timestep() {
                updatePlate();
                updateTime(currentStep / getMaxSteps());
                //IncrementStep
                if (currentStep == getMaxSteps()) {
                    clearInterval(intervalFunc);
                    $("#play").val("Play");
                }
                else {
                    currentStep = currentStep + getStepMagnitude();
                    if (currentStep > getMaxSteps()) {
                        currentStep = getMaxSteps();
                    }
                }
            }
            
            //Updates the time interface
            function updateTime(percent) {
                function prettyTime(totalSeconds) {
                    function prettyTimeString(num) {
                        return (num < 10 ? "0" : "") + num;
                    }
                    var hours = Math.floor(totalSeconds / 3600);
                    totalSeconds = totalSeconds % 3600;
                    var minutes = Math.floor(totalSeconds / 60);
                    totalSeconds = totalSeconds % 60;
                    var seconds = Math.floor(totalSeconds);
                    // Pad the minutes and seconds with leading zeros, if required
                    hours = prettyTimeString(hours);
                    minutes = prettyTimeString(minutes);
                    seconds = prettyTimeString(seconds);
                    // Compose the string for display
                    return hours + ":" + minutes + ":" + seconds;
                }
                var time = percent * $("#length").val() * 60;
                $("#time").val(percent);
                $("#displayTime").text(prettyTime(time))
                //Converts a time in milliseconds to a human readable string

            }
            
            //Redraws the plate view. Takes deviceChange as a boolean input. If deviceChange = undefined, it will evaluate to false
            // and the intensity values will not be changed (temporary feature till actual simulation data is presented)
            function updatePlate(deviceChange) {
                deviceChange = deviceChange || false;
                if (deviceChange == true) {
                    currentStep = 0;
                }
                //drawPlate(encoder.intensities[currentStep]);
		drawPlate(encoder.getCurrentIntensities(currentStep));
            }
            
            //Draws a plate given a 3D array of x,y,channel intensities
            function drawPlate(intensityStep) {
                //Executes drawing of a well
                function drawWell(xPosition, yPosition, spacing, fillStyle, lineWidth, lineColor) {
                    context.beginPath();
                    context.fillStyle = fillStyle;
                    context.arc(xPosition * spacing + spacing * 0.5 + lineWidth * 2,
				        yPosition * spacing + spacing * 0.5 + lineWidth * 2,
				        spacing * 0.5, 0, 2 * Math.PI, false);
                    context.fill();
                    context.lineWidth = lineWidth;
                    context.strokeStyle = lineColor;
                    context.stroke();
                    context.closePath();
                }
                //Resizes range bars (simulation progress and simulation speed bars) to
                // width of plate. ONLY WORKS IN CHROME due to #LEDsDisplay compatibility issues

                function drawRangeBars(spacing) {
                    var controlerWidth = spacing * $("#columns").val(); 
                                    var size = 0;
                    var controlElements = ["#view", "#wellIndex", "#LEDsDisplay", 
                                           "label.plate", "#play.plate", "#displayTime"];
                    var controlerBaseSize = 0;
                    var controlerPadding = 4;
                    var minSpeedWidth = 10; //look at CSS for value, don't know how to call in JS
                    for (el in controlElements) {
                        var addition = $(controlElements[el]).width();
                        controlerBaseSize += ($(controlElements[el]).width() + controlerPadding);
                    }
                    var speedWidth = controlerWidth - controlerBaseSize;
                    $("#time").css("width", controlerWidth);
                    $("#speed").css("width", (minSpeedWidth > speedWidth) ? minSpeedWidth:speedWidth);
                }

                var canvas = document.querySelector('canvas');
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
                var spacing = getSpacing($("#columns").val(), $("#rows").val())
                context.clearRect(0, 0, context.canvas.width, context.canvas.height);
                lineWidth = 3;
                drawRangeBars(spacing)
                for (var x = 0; x < intensityStep.length; x++) {
                    for (var y = 0; y < intensityStep[x].length; y++) {
                        //Draw black background
                        drawWell(x, y, spacing, 'rgba(0,0,0,1)', lineWidth, '#000000') //This draws a black background well color
                        for (var c = 0; c < intensityStep[x][y].length; c++) {
                            drawWell(x, y, spacing, 'rgba(255,0,0,' + intensityStep[x][y][c]/encoder.maxGSValue + ')', lineWidth, '#000000');
                        }
                    }
                }
            }

            //Calculates the spacing given current values of the canvas element
            function getSpacing(xNum, yNum) {
                return Math.min(Math.floor((context.canvas.width - 10) / xNum),
                       Math.floor((context.canvas.height - 10) / yNum));
            }

            //Toggle between playing and pausing the well simulation
            $("#play").click(function () {
                var button = $("#play");
                if (button.val() == "Play") {
                    playWellSim();
                    button.val("Pause");
                }
                else if (button.val() == "Pause") {
                    pauseWellSim();
                    button.val("Play");
                }
            });

            //Udates simulation and displayed time after every time step
            $("#time").change(function () {
                currentStep = Math.round($('#time').val() * getMaxSteps());
                updatePlate();
                updateTime(currentStep / getMaxSteps());
            });

            //Redraws the wells when a custom number of rows or columns is inputted by the user
            $("#rows, #columns").change(function () {
                updatePlate(deviceChange = true);
            });

            //Redraws wells to fit the window after resizing; does not resize if plate is hidden
            $(window).resize(function () {
                if ($("#view").val() == "Well View") {
                    updatePlate();
                } else {
                    null;
                }
            });

            //Called when a well is clicked on
            $("#canvas").click(function (e) {
                var parentOffset = $(this).offset();
                var relX = e.pageX - parentOffset.left;
                var relY = e.pageY - parentOffset.top;
                var xNum = $("#columns").val();
                var yNum = $("#rows").val();
                var spacing = getSpacing(xNum, yNum);
                var realxNum = Math.ceil(relX / spacing);
                var realyNum = Math.ceil(relY / spacing);
                if (realxNum <= xNum && realyNum <= yNum) {
                    var col = Math.min(Math.ceil(relX / spacing), xNum);
                    var row = Math.min(Math.ceil(relY / spacing), yNum);
                    $("#WellRow").val(row);
                    $("#WellCol").val(col);   
                }
            });

            return {
                init: function (deviceChange) {
                    updatePlate(deviceChange);
                }
            }
        })();

        //Recreates the chart, probably not efficient, but allows it to scale size correctly
        function createChart() {
            chart = new CanvasJS.Chart("wellSim",
		        {
		            title: {
		                text: "Time Course for Well 1, 1",
		                fontSize: 24,
		            },
                    zoomEnabled: true, 
		            axisX: {
		                valueFormatString: "DD/MMM"
		            },
		            toolTip: {
		                shared: true
		            },
		            legend: {
                        cursor: "pointer",
                        itemclick: function (e) {
                            //console.log("legend click: " + e.dataPointIndex);
                            //console.log(e);
                            if (typeof (e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                                e.dataSeries.visible = false;
                            } else {
                                e.dataSeries.visible = true;
                            }

                            chart.render();
                        }
		            },

		            data: [
			        {
			            type: "line",
			            showInLegend: true,
			            lineThickness: 2,
			            name: "LED1",
			            markerType: "square",
			            color: "#F08080",
			            dataPoints: [
				        { x: new Date(2010, 0, 3), y: 650 },
				        { x: new Date(2010, 0, 5), y: 700 },
				        { x: new Date(2010, 0, 7), y: 710 },
				        { x: new Date(2010, 0, 9), y: 658 },
				        { x: new Date(2010, 0, 11), y: 734 },
				        { x: new Date(2010, 0, 13), y: 963 },
				        { x: new Date(2010, 0, 15), y: 847 },
				        { x: new Date(2010, 0, 17), y: 853 },
				        { x: new Date(2010, 0, 19), y: 869 },
				        { x: new Date(2010, 0, 21), y: 943 },
				        { x: new Date(2010, 0, 23), y: 970 }
				        ]
			        },
			        {
			            type: "line",
			            showInLegend: true,
			            name: "LED2",
			            color: "#20B2AA",
			            lineThickness: 2,

			            dataPoints: [
				        { x: new Date(2010, 0, 3), y: 510 },
				        { x: new Date(2010, 0, 5), y: 560 },
				        { x: new Date(2010, 0, 7), y: 540 },
				        { x: new Date(2010, 0, 9), y: 558 },
				        { x: new Date(2010, 0, 11), y: 544 },
				        { x: new Date(2010, 0, 13), y: 693 },
				        { x: new Date(2010, 0, 15), y: 657 },
				        { x: new Date(2010, 0, 17), y: 663 },
				        { x: new Date(2010, 0, 19), y: 639 },
				        { x: new Date(2010, 0, 21), y: 673 },
				        { x: new Date(2010, 0, 23), y: 660 }
				        ]
			        }


			        ]
		        });
		        chart.render();
        }

        //Toggle between types of visualization
        $("#view").click(function () {
            var button = $("#view");
            if (button.val() == "Plate View") {
                $(".plate").show();
                $(".well").hide();
                button.val("Well View");
                plateManager.init();
            }
            else if (button.val() == "Well View") {
                $(".plate").hide();
                $(".well").show();
                button.val("Plate View");
                createChart();
            }
        });

        return {
            init: function () {
               plateManager.init(true);
            },
            updateDisplayedLEDs: function () {
                var newLEDnum = $("#LEDnum").val(); //The currently selected number of LEDs
                var maxLEDnum = $("#LEDnum").attr("max"); //The maximum number of LEDs
                //=======================================
                //Manage LEDs in visualization
                var displayedLEDs = $("#LEDsDisplay").children().not(".template"); //A list of current LED display settings
                //If there are too many LED objects remove the ones at the end
                if (displayedLEDs.length > newLEDnum) {
                    //Iterate through all the LEDs and start removing them when the current number is surpassed
                    displayedLEDs.each(function (index, elem) {
                        if (index >= newLEDnum) {
                            $(elem).remove();
                        }
                    });
                }
                //If there are too few LED objects append on more
                else if (displayedLEDs.length < newLEDnum) {
                    for (var i = displayedLEDs.length; i < newLEDnum && i < maxLEDnum; i++) {
                        //Pull and clone the html template of an LED
                        var newLED = $("#LEDsDisplay").children().filter(".template").clone(); 
                        newLED.removeClass("template");
                        newLED.css("display", "inline");
                        //newLED.attr("id", "LEDDisplay" + i);
                        //Bind event listener
                        //Add the modified LED html to the page
                        $("#LEDsDisplay").append(newLED);
                    }
                }
            }
        }
    })();

    var inputsManager = (function () {
        /*
        / Add and remove different function types
        */
        //Add functions
        function addFunc(type) {
            // Unique ID of the function
            // Check to see if the counter has been initialized
            if (typeof addFunc.index == 'undefined') {
                // It has not perform the initilization
                addFunc.index = 0;
            }
            //Otherwise increment the index
            else {
                addFunc.index++;
            }
            var newFunc = $("." + type + ".template").clone();
            newFunc.removeClass("template");
            //Fields to give unique identifiers
            var fields;
            if (type == "const") { fields = ["funcType", "start", "replicates", "funcWavelength", "ints", "RC", "CR"]; }
            else if (type == "step") { fields = ["funcType", "start", "replicates", "funcWavelength", "RC", "CR", "amplitude", "stepTime", "samples", "stepUp", "stepDown"]; }
            else if (type == "sine") { fields = ["funcType", "start", "replicates", "funcWavelength", "RC", "CR", "amplitude", "phase", "period", "offset", "samples"] };
            //Cycle through each of the fields giving them unique IDs, names, and associating the labels
            for (var i = 0; i < fields.length; i++) {
                var field = fields[i];
                newFunc.find("input." + field).attr("id", field + addFunc.index);
                newFunc.find("input." + field).attr("name", field + addFunc.index);
                newFunc.find("label." + field).attr("for", field + addFunc.index);
            }

            //Give radio buttons the same name but differnent 
            newFunc.find("input.RC").attr("name", "orientation" + addFunc.index).attr("value", "row");
            newFunc.find("input.CR").attr("name", "orientation" + addFunc.index).attr("value", "column");
            if (type === "step") {
                newFunc.find("input.stepUp").attr("name", "sign" + addFunc.index).attr("value", "stepUp");
                newFunc.find("input.stepDown").attr("name", "sign" + addFunc.index).attr("value", "stepDown");
            }
            //Insert element
            $("#LPSpecs").append(newFunc);
            //Remove function entry when close is clicked
            //This has to be done each time to register the new button
            $(".close").click(function () {
                $(this).parents(".func").remove();

            });
        }
        //Listeners for adding functions
        $("#constButt").click(function () {
            addFunc("const");
        });
        $("#stepButt").click(function () {
            addFunc("step");
        });
        $("#sineButt").click(function () {
            addFunc("sine");
        });
        return {
            updateInputsWavelengths: function () {
                $(".funcWavelength > option").each(function () {
                    $(this).text($("#" + $(this).attr("value")).val());
                });
            },
            removeLED: function (index) {
                $(".wavelength" + index).remove();
            },
            addLED: function (index, id, wavelength) {
                $(".funcWavelength").append($('<option/>').attr("class", "wavelength" + index).attr("value", id).text(wavelength));
            }
        }
    })();

    var devicesManager = (function (inputs, simulation) {
        function update() {
            var fields = $("#LDSpecs").children().not("#devicesli");
            var device = $("#devices").val()
            if (device == "custom") {
                fields.show();
            }
            else {
                fields.hide();
                if (device == "LTA") { setDeviceFields(8, 8, [10, 20, 30, 40]); }
                else if (device == "LPA") { setDeviceFields(4, 6, [11, 22], [[1, 0, 0], [0, 1, 0]]) }
                else if (device == "TCA") { setDeviceFields(8, 12, [12, 23], [[0, 1, 0], [0, 0, 1]]) }
            }
            simulation.init();
        }
        //Updates the wavelengths in each of the inputs open

        function setDeviceFields(rows, columns, wavelengths) {
            $("#rows").val(rows);
            $("#columns").val(columns);
            $("#LEDnum").val(wavelengths.length);
            updateWavelengthNumber();
            updateWavelengthValues(wavelengths);
            //Update wavelengths in the inputs
            inputs.updateInputsWavelengths();
            //Update the LEDs displayed in the simulation
            simulation.updateDisplayedLEDs();
        }
        function updateWavelengthNumber() {
            //Update LED number
            var newLEDnum = $("#LEDnum").val(); //The currently selected number of LEDs
            var maxLEDnum = $("#LEDnum").attr("max"); //The maximum number of LEDs
            //===================================
            //Manage LEDs in inputs
            var currentLEDs = $("#LEDs").children().not(".template"); //A list of current LED objects
            //If there are too many LED objects remove the ones at the end
            if (currentLEDs.length > newLEDnum) {
                //Iterate through all the LEDs and start removing them when the current number is surpassed
                currentLEDs.each(function (index, elem) {
                    if (index >= newLEDnum) {
                        $(elem).remove();
                        //Remove LED entry from dropdown in  inputs
                        inputs.removeLED(index);
                    }
                });
            }
            //If there are too few LED objects append on more
            else if (currentLEDs.length < newLEDnum) {
                for (var i = currentLEDs.length; i < newLEDnum && i < maxLEDnum; i++) {
                    var newLED = $("#LEDs").children().filter(".template").clone(); //Pull and clone the html template of an LED
                    newLED.removeClass("template");
                    //Add unique identifiers to the varius inputs of the LED
                    newLED.children().filter("label").attr("for", "LED" + i);
                    newLED.children().filter("input").attr("id", "LED" + i).attr("name", "LED" + i);
                    //Change the text
                    newLED.children().filter("label").text("Wavelength for LED " + (i + 1));
                    //Bind event listener
                    newLED.children().filter("input").bind("change", function () {
                        inputs.updateInputsWavelengths();
                    });
                    //Add the modified LED html to the page
                    $("#LEDs").append(newLED);
                    //Add LED entry to dropdown in inputs
                    inputs.addLED(i, newLED.children().filter("input").attr("id"), newLED.children().filter("input").attr("value"));
                }
            }
        }
        function updateWavelengthValues(wavelengths) {
            //Update LED wavelengths
            for (var i = 0; i < wavelengths.length; i++) {
                $("#LED" + i).val(wavelengths[i]);
            }
        }
        //Listen for changes to the device selector
        $("#devices").change(function () {
            update();
        });
        //Event listening to changes in LED number
        $("#LEDnum").change(function () {
            updateWavelengthNumber();
            inputs.updateInputsWavelengths();
            simulation.updateDisplayedLEDs();
        });

        update();

    })(inputsManager, simulationManager);
})();