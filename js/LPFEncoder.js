function LPFEncoder () {
    // default device params for drawing initial plate
 	this.rows = $("#columns").val(); // REVERSED (TEMP Fix)
	this.cols = $("#rows").val(); // REVERSED (TEMP Fix)
    this.tubeNum = this.cols * this.rows;
    this.channelNum = 4;
    this.totalTime = 1000; //ms
    this.timeStep = 1000; //ms
    this.numPts = Math.floor(this.totalTime/this.timeStep + 1);
    this.maxGSValue = 4095;
    this.times = new Array(this.numPts);
    for (i=0; i<this.times.length; i++) {
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
 	this.rows = $("#columns").val(); // REVERSED (TEMP Fix)
	this.cols = $("#rows").val(); // REVERSED (TEMP Fix)
	this.tubeNum = this.rows * this.cols;
	this.channelNum = $("#LEDnum").val();
	console.log("Channel Num: " + this.channelNum);
	this.totalTime = Math.floor($("#length").val() * 60 * 1000); // in ms
	this.timeStep = $("#timestep").val() * 1000; // in ms
	this.numPts = Math.floor(this.totalTime/this.timeStep + 1);
	this.maxGSValue = 4095;
	this.times = new Array(this.numPts);
	for (i=0; i<this.times.length; i++) {
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
    
    this.getWellChartIntensities = function(wellIndex, channelIndex) {
	var dataPoints = new Array(this.numPts);
	for (i=0;i<this.numPts;i++) {
	    dataPoints[i] = {x: this.times[i]/1000/60, y: this.intensities[this.stepInIndex*i + this.channelNum*wellIndex + channelIndex]};
	}
	return dataPoints;
    }
    
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
	saveAs(new Blob([this.buff], {type: "LPF/binary"}), "testfile.lpf");
	
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
  console.log("Step time: " + this.stepTime);
  this.samples = Math.floor($("#samples"+funcNum).val()*1); // num
  this.sign = $('input[id=stepUp'+funcNum+']:checked').val(); // 'stepUp' vs 'stepDown'
  if (this.sign == undefined) {
    this.sign = 'stepDown';
  }
  
  // Write new well intensities
  this.runFunc = function () {
    //var timePoints = repeatArray(numeric.linspace(this.stepTime, parentLPFE.totalTime, this.samples), this.samples*this.replicates);
    var timePoints = repeatArray(numeric.linspace(parentLPFE.totalTime, this.stepTime, this.samples), this.samples*this.replicates);
    for (i=0;i<timePoints.length;i++) {
	var startTimeIndex = findClosestTime(timePoints[i], parentLPFE.times);
	if (this.orientation == 'row') {
	    var wellNum = parentLPFE.randMatrix[this.start+i];
	}
	else {
	    var wellNum = incrememntByCol(this.start,i,parentLPFE.rows,parentLPFE.cols,parentLPFE.randMatrix);
	}
	parentLPFE.timePoints[wellNum] = timePoints[i];
	//var startIntIndex = this.getIntIndex(startTimeIndex, wellNum, this.channel);
	if (this.sign == 'stepUp') {
	    for (time_i=startTimeIndex;time_i<parentLPFE.numPts;time_i++) {
		ind = this.getIntIndex(time_i, wellNum, this.channel);
		parentLPFE.intensities[ind] = parentLPFE.intensities[ind] + this.amplitude;
	    }
	}
	else {
	    for (time_i=startTimeIndex;time_i<parentLPFE.numPts;time_i++) {
		//var ind = startIntIndex + parentLPFE.stepInIndex * time_i;
		ind = this.getIntIndex(time_i, wellNum, this.channel);
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