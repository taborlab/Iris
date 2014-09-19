function LPFEncoder () {
    // default device params for drawing initial plate
    this.rows = $("#rows").val();
    this.cols = $("#columns").val();
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
    this.offOnFinish = false;
    
    // create intensities array & initialize all values to 0
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

    //Generates the correct LED values
    this.deviceLEDs = function() {
        var plateType = $("#devices").val();
        var LEDcolors = [];
        var LEDwaves = [];
	var LEDhex = [];
        if (plateType == "LTA") {
            //LEDcolors = ['rgba(196,0,0,', 'rgba(0,255,0,', 'rgba(0,0,255,', 'rgba(255,0,0,'];
	    LEDcolors = ['rgba(255,0,0,', 'rgba(0,201,86,', 'rgba(0,90,222,', 'rgba(99,0,0,'];
            LEDwaves = [650, 510, 475, 700];
	    LEDhex = ['#FF0000', '#00C956', '#005ADE', '#630000'];
        } else if (plateType == "LPA") {
            //LEDcolors = ['rgba(255,0,0,', 'rgba(0,255,0,'];
	    LEDcolors = ['rgba(255,0,0,', 'rgba(0,201,86,'];
            LEDwaves = [650, 510];
	    LEDhex = ['#FF0000', '#00C956'];
        } else if (plateType == "TCA") {
            //LEDcolors = ['rgba(255,0,0,', 'rgba(0,255,0,'];
	    LEDcolors = ['rgba(255,0,0,', 'rgba(0,201,86,'];
            LEDwaves = [650, 510];
	    LEDhex = ['#FF0000', '#00C956'];
	} else if (plateType == "OGS") {
            //LEDcolors = ['rgba(255,0,0,', 'rgba(0,255,0,'];
	    LEDcolors = ['rgba(255,0,0,', 'rgba(0,201,86,'];
            LEDwaves = [650, 510];
	    LEDhex = ['#FF0000', '#00C956'];
        } else if (plateType == "custom") {
            //var numLED = $("#LEDnum").val();
            //LEDcolors = ['rgba(255,0,0,', 'rgba(0,255,0,', 'rgba(0,0,255,', 'rgba(50,50,50,'];
	    LEDcolors = ['rgba(255,0,0,', 'rgba(0,201,86,', 'rgba(0,90,222,', 'rgba(99,0,0,'];
            LEDwaves = [650, 510, 475, 700]
	    LEDhex = ['#FF0000', '#00C956', '#005ADE', '#630000'];
            // Will make this actually function after refactering of "custom" LED code
        }
        return {colors: LEDcolors,
        	waves: LEDwaves,
		hex: LEDhex};
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
	this.totalTime = Math.floor($("#length").val() * 60 * 1000); // in ms
	this.timeStep = $("#timestep").val() * 1000; // in ms
	this.numPts = Math.floor(this.totalTime/this.timeStep + 1);
	this.maxGSValue = 4095;
	this.times = new Array(this.numPts);
	for (i=0; i<this.times.length; i++) {
	    this.times[i] = this.timeStep * i;
	}
	this.randomized = document.getElementById("randomized").checked;
	this.offOnFinish = document.getElementById("offSwitch").checked;
	this.stepInIndex = this.tubeNum * this.channelNum;
	this.wellFuncIndex = Array(this.stepInIndex); // Array of objects containing counts of all functions applied to a well/channel
	for (var i=0;i<this.stepInIndex;i++) {
	    this.wellFuncIndex[i] = {constantCount: 0, stepCount: 0, sineCount: 0, arbCount: 0};
	}
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
	
	// TEST INTENSITIES
	//var test_ints = numeric.linspace(0,4095,this.tubeNum);
	for (var i=0; i<this.intensities.length;i++) {
	    this.intensities[i] = 0;
	    //this.intensities[i] = Math.floor(Math.random()*this.maxGSValue);
	    //if (i%this.channelNum==0) {
		//this.intensities[i] = Math.floor(test_ints[Math.floor(i/4)]);
	    //}
	    //else {
		//this.intensities[i] = 0;
	    //}
	}
	
	///////////////
	// Placeholder functions for program
	this.functions = [];
        //this.functions[0]=1; // this is weird / janky.
	// if this is fixed, remember to also fix the error checking in runFuncs below
	///////////////
    };
    
    this.getCurrentIntensities = function(currentStep) {
	var subArr = this.intensities.subarray(currentStep*this.stepInIndex, (currentStep+1)*this.stepInIndex);
	var intensityStep = new Array(this.rows);
	for (var r=0;r<this.rows;r++) {
	    intensityStep[r] = new Array(this.cols);
	    for (var c=0;c<this.cols;c++) {
		//if (c==0) {
		//    intensityStep[r] = new Array(this.cols);
		//}
		var wellNum = r*this.cols+c;
		intensityStep[r][c] = new Array(this.channelNum);
		for (var channelIndex=0;channelIndex<this.channelNum;channelIndex++) {
		    //if (channelIndex==0) {
			//intensityStep[r][c] = new Array(this.channelNum)
		    //}
		    intensityStep[r][c][channelIndex] = subArr[wellNum*this.channelNum + channelIndex]
		}
	    }
	}
	return intensityStep;
    };
    
    this.getWellChartIntensities = function(wellIndex, channelIndex) {
	var dataPoints = new Array(this.numPts);
	for (var i=0;i<this.numPts;i++) {
	    dataPoints[i] = {x: this.times[i]/1000/60, y: this.intensities[this.stepInIndex*i + this.channelNum*wellIndex + channelIndex]};
	}
	return dataPoints;
    }
    
    // Takes a set of function elements and parses them int this.functions[]
    this.parseFunctions = function (functionsToParse, refreshCallback) {
      for(var i=0;i<functionsToParse.length;i++) {
        var func=functionsToParse.eq(i);
        var funcType = func.find(".funcType").val();
        if (funcType == 'constant') {
            this.functions[i] = new ConstantFunction(func,this);
        }
        else if (funcType == 'step') {
            this.functions[i] = new StepFunction(func,this);	
        }
        else if (funcType == 'sine') {
            this.functions[i] = new SineFunction(func,this);
        }
        else if (funcType == 'arb') {
            this.functions[i] = new ArbFunction(func,this,refreshCallback);
        }        
      }
    };
    
    // function: calculate maximum time step
	// Calculates the largest time step (ms) possible for program to minimize file size & computational effort
    this.calcMaxTimeStep = function () {
	return 1000; // ms
    };
    
    // function: run functions, modify intensities as appropriate
    this.runFunctions = function () {
	if (this.functions.length == 0) {
	    throw new Error("No functions specified.");
	}
		for (var i=0;i<this.functions.length;i++) {
		    if (this.functions[i].funcType != 'arb') {
			// arb funcs get run as soon as they're parsed (which is actually later when the CSVs are read asynchronously)
			this.functions[i].runFunc();
		    }
		}
    };
    
    this.writeLPF = function() {
	// set all channels to 0GS at last timestep to turn off device
	//console.log(this.intensities.subarray((this.numPts-1)*this.stepInIndex-4, this.intensities.length-90));
	if (this.offOnFinish) {
	    for (var wn=0;wn<this.tubeNum;wn++) {
		for (var ch=0;ch<this.channelNum;ch++) {
		    var ind = this.stepInIndex*(this.numPts-1) + this.channelNum*wn + ch;
		    if (ind < 4) {
			console.log("Index: " + ind)
		    }
		    this.intensities[ind] = 0;
		}
	    }
	}
	//console.log(this.intensities.subarray((this.numPts-1)*this.stepInIndex-4, this.intensities.length-90));
	
	// Saves the buffer (this.buff) which contains the header and the intensity array
	saveAs(new Blob([this.buff], {type: "LPF/binary"}), "program.lpf");
	
	// Make CSV with randomization matrix & time points
	var CSVStr = "Well Number," + "Randomized Index," + "Time Points" + "\n";
	for (var i=0;i<this.tubeNum;i++) {
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
    
    this.checkArbFuncs = function() {
	// Checks for multiple Arb functions writing to same well/channel or an arb func over-writing other funcs
	for (var i=0;i<this.wellFuncIndex.length;i++) {
	    var wcCounts = this.wellFuncIndex[i];
	    var w = Math.floor(i/this.channelNum);
	    var c = i%this.channelNum;
	    if (wcCounts.arbCount > 0) {
		if (wcCounts.constantCount > 0 || wcCounts.stepCount > 0 || wcCounts.sineCount > 0) {
		    throw new Error("Arb function over-wrote other functions on well " + w + ", channel " + c);
		}
		if (wcCounts.arbCount > 1) {
		    throw new Error("Multiple Arb functions were written to well " + w + ", channel " + c);
		}
	    }
	}
    }

};

function ConstantFunction (func, parentLPFE) {
  // Constant input function
  this.funcType = 'constant';
  this.start = parseInt(func.find("input[class=start]").val()) - 1; // convert to base 0 numbers
  this.orientation = func.find('input[class=RC]:checked').val();
  if (this.orientation==undefined) {
    this.orientation = 'col';
  }
  this.replicates = parseInt(func.find("input[class=replicates]").val());
  this.channel = parseInt(func.find("select[class=funcWavelength]")[0].selectedIndex);
  
  this.ints = func.find("input[class=ints]").val();
  this.ints = JSON.parse("[" + this.ints + "]");
  this.ints = numeric.round(this.ints); // Make sure all ints are whole numbers
  
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
	parentLPFE.wellFuncIndex[startIntIndex].constantCount += 1;
	if (parentLPFE.wellFuncIndex[startIntIndex].constantCount == 1) {
	    for (time_i=0;time_i<parentLPFE.numPts;time_i++) {
		var new_int = this.checkInt(parentLPFE.intensities[startIntIndex + parentLPFE.stepInIndex * time_i] + intsRepd[tube_i]);
		parentLPFE.intensities[startIntIndex + parentLPFE.stepInIndex * time_i] = new_int;
	    
	    }
	} else {
	    throw new Error("Attempted to write second Constant function to well index " + ((startIntIndex-this.channel)/parentLPFE.channelNum) + " , channel " + this.channel);
	    continue;
	}
	
    }
  };
  
  this.getIntIndex = function (timeIndex, wn, channel) {
    // returns the index of the desired intensity value
    return parentLPFE.stepInIndex * timeIndex + wn*parentLPFE.channelNum + channel;
  };
  
  this.checkInt = function (new_int) {
    // ensures the intensity to be written is valid
    if (new_int > parentLPFE.maxGSValue) {
	throw new Error("Attempted to write intensity greater than max allowbale. Int: " + new_int);
	return parentLPFE.maxGSValue;
    } else {
	return new_int;
    }
  }
};

function StepFunction (func, parentLPFE) {
  // Constant input function
  this.funcType = 'step';
  this.start = parseInt(func.find("input[class=start]").val()) - 1; // convert to base 0 numbers
  this.orientation = func.find('input[class=RC]:checked').val();
  if (this.orientation==undefined) {
    this.orientation = 'col';
  }
  this.replicates = parseInt(func.find("input[class=replicates]").val());
  this.channel = parseInt(func.find("select[class=funcWavelength]")[0].selectedIndex);
  
  //this.amplitude = parseInt(func.find("input[class=amplitude]").val()); // GS
  this.amplitudes = func.find("input[class=amplitudes]").val();
  this.amplitudes = JSON.parse("[" + this.amplitudes + "]");
  this.amplitudes = numeric.round(this.amplitudes); // Make sure all amps are whole numbers
  
  this.offset = parseInt(func.find("input[class=offset]").val()); // GS
  this.stepTime = Math.floor(parseFloat(func.find("input[class=stepTime]").val()) * 60 * 1000); // ms
  this.samples = parseInt(func.find("input[class=samples]").val()); // num
  this.sign = func.find('input[class=stepUp]:checked').val(); // 'stepUp' vs 'stepDown'
  if (this.sign == undefined) {
    this.sign = 'stepDown';
  }
  
  // Write new well intensities
  this.runFunc = function () {
    //var timePoints = repeatArray(numeric.linspace(this.stepTime, parentLPFE.totalTime, this.samples), this.samples*this.replicates);
    if (this.samples == 1) {
	var timePoints = repeatArray([this.stepTime], this.replicates*this.amplitudes.length);
	if (this.replicates > 1) { // no replication of amps necessary if replicates = 1; cannot have replicates < 1
	    var ampsRep = repeatArray(this.amplitudes, this.replicates*this.amplitudes.length)
	}
	else {
	    var ampsRep = this.amplitudes;
	}
    } else {
	var timePoints = repeatArray(numeric.linspace(parentLPFE.totalTime, this.stepTime, this.samples), this.samples*this.replicates*this.amplitudes.length);
	var ampsRep = new Array(this.amplitudes.length*this.samples*this.replicates);
	for (var r=0;r<this.replicates;r++) {
	    for (var a=0;a<this.amplitudes.length;a++) {
		for (var s=0;s<this.samples;s++) {
		    var ind = r*this.amplitudes.length*this.samples + a*this.samples + s;
		    ampsRep[ind] = this.amplitudes[a];
		}
	    } 
	}
    }
    for (var i=0;i<timePoints.length;i++) {
	var startTimeIndex = findClosestTime(timePoints[i], parentLPFE.times);
	if (this.orientation == 'row') {
	    var wellNum = parentLPFE.randMatrix[this.start+i];
	}
	else {
	    var wellNum = incrememntByCol(this.start,i,parentLPFE.rows,parentLPFE.cols,parentLPFE.randMatrix);
	}
	parentLPFE.timePoints[wellNum] = Math.round(parentLPFE.totalTime - timePoints[i]);
	//var startIntIndex = this.getIntIndex(startTimeIndex, wellNum, this.channel);
	parentLPFE.wellFuncIndex[wellNum + this.channel].stepCount += 1;
	if (this.sign == 'stepUp') {
	    for (var time_i=0;time_i<startTimeIndex;time_i++) {
		var ind = this.getIntIndex(time_i, wellNum, this.channel);
		var new_int = this.checkInt(parentLPFE.intensities[ind] + this.offset);
		parentLPFE.intensities[ind] = new_int;
	    }
	    for (var time_i=startTimeIndex;time_i<parentLPFE.numPts;time_i++) {
		var ind = this.getIntIndex(time_i, wellNum, this.channel);
		var new_int = this.checkInt(parentLPFE.intensities[ind] + ampsRep[i] + this.offset);
		parentLPFE.intensities[ind] = new_int;
	    }
	}
	else {
	    for (var time_i=0;time_i<startTimeIndex;time_i++) {
		var ind = this.getIntIndex(time_i, wellNum, this.channel);
		var new_int = this.checkInt(parentLPFE.intensities[ind] + this.offset);
		parentLPFE.intensities[ind] = new_int;
	    }
	    for (var time_i=startTimeIndex;time_i<parentLPFE.numPts;time_i++) {
		//var ind = startIntIndex + parentLPFE.stepInIndex * time_i;
		var ind = this.getIntIndex(time_i, wellNum, this.channel);
		var new_int = this.checkInt(parentLPFE.intensities[ind] - ampsRep[i] + this.offset);
		parentLPFE.intensities[ind] = new_int;
	    }
	}
    }
  };
  
  this.getIntIndex = function (timeIndex, wn, channel) {
    // returns the index of the desired intensity value
    return parentLPFE.stepInIndex * timeIndex + wn*parentLPFE.channelNum + channel;
  };
  
  this.checkInt = function (new_int) {
    // checks that new intensity to be written is valid
    if (new_int < 0) {
	throw new Error("Attempted to write intensity less than 0. Int: " + new_int);
	return 0;
    } else if (new_int > parentLPFE.maxGSValue) {
	throw new Error("Attepmted to write intensity greater than max. Int: " + new_int);
	return parentLPFE.maxGSvalue;
    } else {
	return new_int;
    }
  }
};

function SineFunction (func, parentLPFE) {
  // Constant input function
  this.funcType = 'sine';
  this.start = parseInt(func.find("input[class=start]").val()) - 1; // convert to base 0 numbers
  this.orientation = func.find('input[class=RC]:checked').val();
  if (this.orientation==undefined) {
    this.orientation = 'col';
  }
  this.replicates = parseInt(func.find("input[class=replicates]").val());
  this.channel = parseInt(func.find("select[class=funcWavelength]")[0].selectedIndex);
  
  this.amplitude = parseInt(func.find("input[class=amplitude]").val()); // GS
  this.period = parseFloat(func.find("input[class=period]").val()) * 60 * 1000; // ms
  this.samples = parseInt(func.find("input[class=samples]").val()); // number
  this.phase = parseFloat(func.find("input[class=phase]").val()) * 60 * 1000; // ms
  this.offset = parseInt(func.find("input[class=offset]").val()); // GS
  // Write new well intensities
  this.runFunc = function () {
    var rem_offset = parentLPFE.totalTime % this.period;
    var startTimes = repeatArray(numeric.linspace(0,this.period,this.samples+1).slice(0,-1), this.samples * this.replicates);
    
    for (i=0;i<startTimes.length;i++) {
	var startTimeIndex = 0;
	if (this.orientation == 'row') {
	    var wellNum = parentLPFE.randMatrix[this.start+i];
	}
	else {
	    var wellNum = incrememntByCol(this.start,i,parentLPFE.rows,parentLPFE.cols,parentLPFE.randMatrix);
	}
	parentLPFE.timePoints[wellNum] = startTimes[i];
	parentLPFE.wellFuncIndex[wellNum + this.channel].sineCount += 1;
	var startIntIndex = this.getIntIndex(startTimeIndex, wellNum, this.channel);
	for (time_i=startTimeIndex;time_i<parentLPFE.numPts;time_i++) {
	    var ind = startIntIndex + parentLPFE.stepInIndex * (time_i - startTimeIndex);
	    var t = parentLPFE.times[time_i] + startTimes[i] - rem_offset;
	    var new_int = this.checkInt(parentLPFE.intensities[ind] + this.amplitude * Math.sin(2*Math.PI*(t-this.phase)/this.period) + this.offset);
	    parentLPFE.intensities[ind] = new_int;
	}
    }
  };
  
  this.getIntIndex = function (timeIndex, wn, channel) {
    // returns the index of the desired intensity value
    return parentLPFE.stepInIndex * timeIndex + wn*parentLPFE.channelNum + channel;
  };
  
  this.checkInt = function (new_int) {
    // checks that new intensity to be written is valid
    if (new_int < 0) {
	throw new Error("Attempted to write intensity less than 0. Int: " + new_int);
	return 0;
    } else if (new_int > parentLPFE.maxGSValue) {
	throw new Error("Attepmted to write intensity greater than max. Int: " + new_int);
	return parentLPFE.maxGSvalue;
    } else {
	return new_int;
    }
  }
};

function ArbFunction (func, parentLPFE, refreshCallback) {
  // Arbitrary input function, designed to be used with Evan's code
  this.funcType = 'arb';
  this.refreshCallback = refreshCallback;
  this.start = parseInt(func.find("input[class=start]").val()) - 1; // convert to base 0 numbers
  this.orientation = func.find('input[class=RC]:checked').val();
  if (this.orientation==undefined) {
    this.orientation = 'col';
  }
  else {
    this.orientation = 'row';
  }
  this.channel = parseInt(func.find("select[class=funcWavelength]")[0].selectedIndex);
  this.replicates = parseInt(func.find("input[class=replicates]").val());
  
  this.precondition = func.find("input[class=precondition]").val(); // GS
  // THIS IS BROKEN
  //this.precondition = 0;

  var arbfile = func.find("input[class=file]")[0].files[0]
  console.log("File information: " + arbfile.type);
  // very mild file type checking; could be better
  if (arbfile.type.search("csv") == -1 && arbfile.type.search("excel") == -1) {
    // "csv" not found in file type; probably not a CSV
    throw new Error("Invalid Input File");
  }
  
  this.stepTimes = [];
  this.stepValues = [];
  this.timePoints = [];
  var arbfunc = this;

  Papa.parse(arbfile, {
    dynamicTyping: true,
    complete: function(results) {
	// Check for Papa Parse errors:
	if (results.errors.length > 0) {
	    var errMsg = 'Papa Parse encountered problems parsing CSV in Arb Func! Data:\n';
	    for (var ei=0; ei<results.errors.length; ei++) {
		errMsg += "Error Num: " + ei + "\n";
		errMsg += "Type:\t" + results.errors[ei].type + "\n";
		errMsg += "Code:\t" + results.errors[ei].code + "\n";
		errMsg += "Message:\t" + results.errors[ei].message + "\n";
		errMsg += "Line:\t" + results.errors[ei].line + "\n";
		errMsg += "Row:\t" + results.errors[ei].row + "\n";
		errMsg += "Index:\t" + results.errors[ei].index + "\n";
	    }
	    throw new Error(errMsg);
	}
	    for (var l=0;l<results.data.length;l++){		
		var line = results.data[l];
		var stepTime = line[0];
		var stepVal = line[1];
		var timePt = line[2];
		var stepsDone = false; // used to make sure all cells after a blank are disregarded; unimplemented
		var timesDone = false;
		
		///////
		// ERROR CHECKING
		// If error found, code skips entire row!
		if (typeof stepTime == 'string') { // headers possible
		    if (typeof stepVal == 'string' && typeof timePt == 'string' && l == 0) { // header detected
			continue;
		    } else { // problem detected!
			if (stepTime == '') { // empty cell, possibly missing data
			    if (stepVal == '' && timePt == '') { // missing row; probably recoverable
				throw new Error("Missing line of CSV data. Probably recoverable, but not intended. Line in CSV: " + l);
				continue;
			    } else if (stepVal != '') {
				throw new Error("Missing data! CSV line: " + l + ", in stepTime");
				continue;
			    }
			} else { // random text in the data
			    throw new Error("Errant text in CSV data field! CSV line: " + l, ", in stepTime");
			    continue;
			}
		    }
		} else if (typeof stepTime != "number") { // bad input
		    throw new Error("CSV data type error, line: " + l + ", in stepTime. Value: " + stepTime + " , type: " + typeof stepTime);
		    continue;
		} else { // data is a number, converted to int
		    stepTime = parseInt(stepTime); // ensure Int type
		    if (isNaN(stepTime)) { // NaN's are "number"s, stupidly
			throw new Error("stepTime in line " + l + " parsed as NaN.");
			continue;
		    } else if (stepTime > parentLPFE.totalTime || stepTime < 0) {
			throw new Error("stepTime in line " + l + " out of total time range. stepTime: " + stepTime);
			continue;
		    } else {
			if (stepTime < arbfunc.stepTimes[arbfunc.stepTimes.length - 1]) {
			    throw new Error("stepTime on line " + l + " is not after the time before it.");
			}
			arbfunc.stepTimes.push(stepTime);
		    }
		}
		
		if (typeof stepVal == 'string') {
		    if (stepVal == '' && stepTime != '') { 
			throw new Error("Missing data! CSV line: " + l + ", in stepVal");
			continue;
		    } else if (stepVal != ''){
			throw new Error("Errant text in CSV data field! CSV line: " + l, ", in stepVal");
			continue;
		    }
		} else if (typeof stepVal != 'number' && stepVal != '') {
		    throw new Error("CSV data type error, line: " + l + ", in stepVal. Value: " + stepVal + " , type: " + typeof stepVal);
		    continue;
		} else {
		    stepValInt = parseInt(stepVal);
		    if (isNaN(stepTime) && stepVal != '') {
			throw new Error("stepVal in line " + l + " parsed as NaN.");
			continue;
		    } else if (stepVal != '' && (stepVal > parentLPFE.maxGSValue || stepVal < 0)) {
			throw new Error("stepVal in line: " + l + " out of greyscale range. stepVal: " + stepVal);
			continue;
		    } else {
			arbfunc.stepValues.push(stepVal);
		    }
		}
		
		if (typeof timePt == 'string' && timePt != '') {
		    throw new Error("Errant text in CSV data field! CSV line: " + l, ", in timePt");
		    continue;
		} else if (typeof timePt != 'number' && timePt != '') {
		    throw new Error("CSV data type error, line: " + l + ", in timePt");
		    continue;
		} else {
		    timePtInt = parseInt(timePt);
		    if (isNaN(timePtInt) && timePt != '') {
			throw new Error("timePt in line " + l + " parsed as NaN.");
			continue;
		    } else if (timePt != '' && (timePtInt < 0 || timePtInt > parentLPFE.totalTime)) {
			throw new Error("timePt in line " + l + " out of total time range. timePt: " + timePtInt);
			continue;
		    } else {
			if (timePt != '') {
			    arbfunc.timePoints.push(timePtInt);
			}
		    }
		}
	    }
	    
	    if (arbfunc.stepTimes.length != arbfunc.stepValues.length) {
		throw new Error("Number of stepValues does not match number of stepTimes!");
	    }
	    if (arbfunc.stepTimes.length < 1) {
		throw new Error("Must have at least one step in Arb function CSV.");
	    }
	    if (arbfunc.timePoints.length < 1) {
		throw new Error("Must have at least one time point in Arb function CSV");
	    }
	    if ((arbfunc.timePoints.length*arbfunc.replicates) > parentLPFE.tubeNum - arbfunc.start) { // could have this loop around if we wanted
		throw new Error("Desired number of time points in Arb function exceed the available number of tubes!");
	    } else {
		arbfunc.timePoints = repeatArray(arbfunc.timePoints, arbfunc.timePoints.length * arbfunc.replicates);
	    }
	    
	    //console.log(arbfunc.stepValues);
	    arbfunc.runFunc();
        }
  })
  
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
    for (var i=0;i<this.stepTimes.length+1;i++) {
	if (i==0) {
	    for (var j=0;j<stepTimeInds[i];j++) {
		unshifted[j] = this.precondition;
	    }
	}
	else if (i>0 && i<this.stepTimes.length) {
	    for (var j=stepTimeInds[i-1];j<stepTimeInds[i];j++) {
		unshifted[j] = this.stepValues[i-1];
	    }
	}
	else {
	    for (var j=stepTimeInds[i-1];j<unshifted.length;j++) {
		unshifted[j] = this.stepValues[this.stepValues.length-1];
	    }
	}
    }
    for (var i=this.timePoints.length-1;i>=0;i--) {
	if (this.orientation == 'row') {
	    var wellNum = parentLPFE.randMatrix[this.start+i];
	}
	else {
	    var wellNum = incrememntByCol(this.start,i,parentLPFE.rows,parentLPFE.cols,parentLPFE.randMatrix);
	}
	parentLPFE.timePoints[wellNum] = this.timePoints[i];
	parentLPFE.wellFuncIndex[wellNum + this.channel].arbCount += 1;
	if (i-this.timePoints.length-1 == 0 && parentLPFE.totalTime-this.timePoints[i] == 0) {
	    // first tube, unshifted
	    var startIntIndex = this.getIntIndex(0, wellNum, this.channel);
	    for (var time_i=0;time_i<parentLPFE.numPts;time_i++) {
		var ind = startIntIndex + parentLPFE.stepInIndex * time_i;
		parentLPFE.intensities[ind] = unshifted[time_i];
	    }
	}
	else {
	    var startIntIndex = this.getIntIndex(0, wellNum, this.channel);
	    for (var time_i=0;time_i<parentLPFE.numPts;time_i++) {
		var ind = startIntIndex + parentLPFE.stepInIndex * time_i;
		if (time_i<tShiftInds[i]) {
		    parentLPFE.intensities[ind] = this.precondition;
		}
		else {
		    var unshiftedIndex = time_i - tShiftInds[i];
		    parentLPFE.intensities[ind] = unshifted[unshiftedIndex];
		}
	    }
	}
    }
    parentLPFE.checkArbFuncs();
    refreshCallback();
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
    var r = Math.floor(wellNum/cols);
    var c = wellNum % cols;
    r += num;
    if (r>=rows) {
	c += Math.floor(r/rows);
	r = r % rows;
    }
    var wn = r*cols+c;
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