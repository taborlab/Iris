//Contains all information for a lpf file
// Replaces LPFEncoder.js
// LPIv2.0
function Plate(form) {
    //Call parsePlate when the object is initialized
    parseInputs(this,form);
    //Parses the entirity of the webform data into a plate object
    //Returns a plate object
    function parseInputs(plate,form) {
        plate.rows = form.find("#rows").val();
        plate.cols = form.find("#columns").val();
        plate.channelNum=form.find("#LEDnum").val();
        plate.totalTime = Math.floor(form.find("#length").val() * 60 * 1000); // in ms
        plate.timeStep = form.find("#timestep").val() * 1000; // in ms
        plate.numPts = Math.floor(plate.totalTime/plate.timeStep + 1);
        plate.maxGSValue = 4095;
        plate.times = new Array(plate.numPts);
	for (i=0; i<plate.times.length; i++) {
	    plate.times[i] = plate.timeStep * i;
	}
        plate.randomized = form.find("#randomized").is(':checked');
        plate.offOnFinish = form.find("#offSwitch").is(':checked');
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
        this.timePoints = numeric.rep([this.tubeNum],-1); // initialize array containing the time points for each tube
	    // NOTE: The indices for these tubes are according to the randomization matrix!!
	    // NOTE: A time of -1 indicates that it was never set; will be changed before writing.
	    // Should check that it's not somehow set more than once!! (right?)
        //A list of all wellArrangements contained on this plate
        plate.wellArrangements=[];
        form.find(".wGroup").not(".template").each(function( index, wellArrangementForm) {
            plate.wellArrangements.push(new WellArrangement($(wellArrangementForm,plate.channelNum), plate));
            });
        //Check if total well number is sufficient, if it isn't throw error
        var numberOfWells=0;
        for (var i=0;i<plate.wellArrangements.length;i++) {
            numberOfWells+=plate.wellArrangements[i].getWellNumber();
        }
        if (plate.rows*plate.columns<numberOfWells) {
            console.log("ERROR TOO MANY WELLS");
        }
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
    //Returns a n x c array of intensities where n is timepoints and c is channel num
    this.createTimecourse = function(wellNum) {
        console.log("Input wellNum: " + wellNum);
        var timeCourses = new Array(this.channelNum);
        if (this.wellArrangements.length == 0) {
            // LPI has just been initialized; there is nothing to show, so initialize with all 0s
            for (var c=0; c<this.channelNum; c++) {
                timeCourses[c] = new Array(this.numPts);
                for (var ti=0; ti<this.numPts; ti++) {
                    timeCourses[c][ti] = {x: this.times[ti]/60/1000, y:0};
                }
            }
            return timeCourses;
        }
        var wellsPassed = 0; // Holds the highest (total) numberof wells passed in earlier WA's
        for (var wa=0; wa<this.wellArrangements.length; wa++) {
            var waWellNum = this.wellArrangements[wa].getWellNumber();
            console.log("Well Arrangement " + wa + " comparison:\n\twellsPassed: " + wellsPassed + "\n\twaWllNum: " + waWellNum);
            if (wellNum < wellsPassed + waWellNum) {
                // Desired well is in this WA
                for (var c=0; c<this.channelNum; c++) {
                    timeCourses[c] = new Array(this.numPts);
                    for (var ti=0; ti<this.numPts; ti++) {
                        var tpInt = this.wellArrangements[wa].getIntensity(wellNum,c,this.times[ti]);
                        timeCourses[c][ti] = {x: this.times[ti]/60/1000, y: tpInt}; // Format as obj/dict for canvasJS plotting.
                    }
                }
                return timeCourses;
            }
            else {
                // Desired well is in another WA. Note passed wells and skip to next WA.
                wellsPassed += waWellNum;
            }
        }
        // If function gets here, wellNum was not found!! (error)
        console.log("ERROR: invalid well given to createTimeCourse!");
        // probably want to have an error here, and check for valid wellNum at beginning
    }
    // Returns a w x c array of intensities where w is wellNumber and c is channel num
    // NOTE: The input is an **index** in plate.times (length: plate.numSteps)
    this.createPlateView = function(timeIndex) {
        var wellSnapshot = new Array(this.rows);
	for (var r=0; r<this.rows; r++) {
	    wellSnapshot[r] = new Array(this.cols);
	    for (var c=0; c<this.cols; c++) {
                wellSnapshot[r][c] = new Array(this.channelNum);
                var wellNum = r*this.cols+c;
                if (this.wellArrangements.length == 0) {
                    // LPI has just been initialized; fill response with all 0s
                    wellSnapshot[r][c][ch] = 0;
                    return wellSnapshot;
                }
                var wellsPassed = 0;
                for (var wa=0; wa<this.wellArrangements.length; wa++) {
                    var waWellNum = this.wellArrangements[wa].getWellNumber();
                    if (wellNum < wellsPassed + waWellNum) {
                        // Desired well is in this WA
                        for (var ch=0; ch<this.channelNum; ch++) {
                            wellSnapshot[r][c][ch] = this.wellArrangements[wa].getIntensity(wellNum,c,this.times[timeIndex]);
                        }
                    }
                    else {
                        // Desired well i in another WA. Note passed wells and skip to next WA.
                        wellsPassed += waWellNum;
                    }
                }
	    }
	}
	return wellSnapshot;
    }
    //creates an LPFfile
    this.createLPF = function() {
        // create intensities array & initialize header values
	this.buff = new ArrayBuffer(32 + 2*this.cols*this.rows*this.channelNum*this.numPts);
	this.header = new Uint32Array(this.buff,0,8);
	this.header[0] = 1; // FILE_VERSION = 1.0
	this.header[1] = this.cols * this.rows * this.channelNum; // NUMBER_CHANNELS (TOTAL number, not per well)
	this.header[2] = this.timeStep; // STEP_SIZE
	this.header[3] = this.numPts; // NUMBER_STEPS
	// remaining header bytes are left empty
	// Fill intensity values using plateview snapshots for each time point    
	this.intensities = new Uint16Array(this.buff, 32);
        var inti = 0;
        for (ti=0; ti<this.numPts; ti++) {
            var snapshot = this.createPlateView(ti);
            for (var r=0; r<this.rows; r++) {
                for (var c=0; c<this.cols; c++) {
                    for (ch=0; ch<this.channelNum; ch++) {
                        this.intensities[inti] = snapshot[r][c][ch];
                        inti += 1;
                    }
                }
            }
        }
        // Write LPF (zipped folder)
        var stepInIndex = this.rows * this.cols * this.channelNum;
        if (this.offOnFinish) {
	    for (var wn=0;wn<this.rows*this.cols;wn++) {
		for (var ch=0;ch<this.channelNum;ch++) {
		    var ind = stepInIndex*(this.numPts-1) + this.channelNum*wn + ch;
		    this.intensities[ind] = 0;
		}
	    }
	}
        // Prepare ZIP folder, starting with the LPF file itself
	var zip = new JSZip();
	var lpfblob = new Blob([this.buff], {type: "LPF/binary"});
	zip.file("program.lpf", this.buff);
	// Make CSV with randomization matrix & time points
        //// Compile list of time points from WAs:
        var timePoints = new Array(this.rows*this.cols);
        var tpi = 0;
        for (var wa=0; wa<this.wellArrangements.length; wa++) {
            var waWellNum = this.wellArrangements[wa].getWellNumber();
            for (waWell=0; waWell<waWellNum; waWell++) {
                timePoints[tpi] = this.wellArrangements.times[waWell];
                tpi += 1;
            }
        }
	var CSVStr = "Well Number," + "Randomized Index," + "Time Points" + "\n";
	for (var i=0;i<this.rows*this.cols;i++) {
	    var tp = timePoints[i];
	    var row = i + "," + this.randMatrix[i] + "," + tp + "\n";
	    CSVStr += row;
	}
	var csvblob = new Blob([CSVStr], {type: "text/csv"});
	zip.file("randomizationMatrix.csv", CSVStr);
	var content = zip.generate({type:"blob"});
	var d = new Date();
	var filename = d.getFullYear() + ("0" + (d.getMonth()+1)).slice(-2)
				       + ("0" + d.getDate()).slice(-2)
				       + "_" + d.getTime();
	saveAs(content, filename);
    }
    //Multiple waveform groups that are spread over a set of well specifications
    function WellArrangement(form, plate) {
        
        //Call Parse inputs when the object is initialized
        parseInputs(this,form);
        //Parses the entirity of the data in a waveform group section of the webpage
        //returns a wellArrangenment
        function parseInputs(wellArrangement,form) {
            wellArrangement.samples = parseInt(form.find("input.samples").val());
            wellArrangement.replicates = parseInt(form.find("input.replicates").val());
            wellArrangement.startTime = parseInt(form.find("input.startTime").val() * 60 * 1000); // ms
            wellArrangement.times = new Array(wellArrangement.samples);
            // Would implement CSV of time points here
            // For algorithmic (linearly spaced) time points:
            totalTime = Math.floor(form.find("#length").val() * 60 * 1000); // in ms
            wellArrangement.times = numeric.linspace(totalTime, wellArrangement.startTime, wellArrangement.samples);
            wellArrangement.waveformInputs=[];
            form.find(".func").not(".template").each(function(index, waveform) {
                var newWaveform;
                waveform = $(waveform);
                if (waveform.hasClass("const")) {
                    newWaveform = new constInput(waveform);
                }else if (waveform.hasClass("step")) {
                    newWaveform = new stepInput(waveform);
                }else if (waveform.hasClass("sine")) {
                    newWaveform = new sineInput(waveform);
                }else if (waveform.hasClass("arb")) {
                    newWaveform = new arbInput(waveform);
                }
                wellArrangement.waveformInputs.push(newWaveform);
            });
            //Create waveform groups, crazy recursion is needed to create all permuatations of
            //input forms which could have multiple waveforms
            //Initialize first waveform group
            wellArrangement.waveformGroups=[];
            //Call function, from first index in list of waveformInputs, and the initial waveform group
            waveformParsing(0,wellArrangement.waveformGroups[0]);
            function waveformParsing(inputIndex) {
                //At the end of recursively going through the waveform inputs create a waveform group
                //add it to the wellArrangment, and return it
                 if (inputIndex>=wellArrangement.waveformInputs.length) {
                    var waveformGroup= new WaveformGroup();
                    wellArrangement.waveformGroups.push(waveformGroup);
                    return waveformGroup;
                 }
                //Loops through the group of waveforms generated by a single input
                var waveforms = wellArrangement.waveformInputs[inputIndex].generateWaveforms();
                for (waveformIndex=0; waveformIndex<waveforms.length;waveformIndex++) {
                    //Recursively calls this function on the next input
                    //then adds the current waveform to the waveform group returned by the recursion
                    waveformParsing(inputIndex+1).addWaveform(waveforms[waveformIndex],wellArrangement.waveformInputs[inputIndex].channel);
                }
            }
            //contains the inputs associated a constant input in the webform
            function constInput(form) {
                this.channel = parseInt(form.find("select[class=funcWavelength]")[0].selectedIndex);
                this.amplitudes = form.find("input.ints").val();
                this.amplitudes = JSON.parse("[" + this.amplitudes + "]");
                this.amplitudes = numeric.round(this.amplitudes); // Make sure all ints are whole numbers
                //Gives the number of different waveforms that this input will create
                this.getNumWaveforms = function(){
                    return amplitudes.length;
                }
                //returns a list of waveforms associated with this constant input
                this.generateWaveforms = function() {
                    var waveforms = [];
                    for (i=0;i<this.amplitudes.length;i++) {
                        waveforms.push(function(time){return this.amplitudes[i]}) // Should be this.amplitudes[i] ??
                    }
                    return waveforms;
                }
            }
            //contains the inputs associated a step input in the webform
            function stepInput(form) {
                this.channel = parseInt(form.find("select[class=funcWavelength]")[0].selectedIndex);
                this.amplitudes = form.find("input.amplitudes").val();
                this.amplitudes = JSON.parse("[" + this.amplitudes + "]");
                this.amplitudes = numeric.round(this.amplitudes); // Make sure all amps are whole numbers
                this.offset = parseInt(form.find("input.offset").val()); // GS
                this.stepTime = Math.floor(parseFloat(form.find("input.stepTime").val()) * 60 * 1000); // ms
                //Check if step doesn't exceed max or go lower than 0
                if (this.offset>4095||this.offset<0) {
                    console.log("ERROR step function exceeds bounds");
                }
                for (i=0;i<this.amplitudes.length;i++) {
                    if (this.offset+this.amplitudes[i]>4095||this.offset+this.amplitudes[i]<0) {
                        console.log("ERROR step function exceeds bounds");
                    }
                }
                //Gives the number of different waveforms that this input will create
                this.getNumWaveforms = function(){
                    return amplitudes.length;
                }
                //returns a list of waveforms associated with this input
                this.generateWaveforms = function() {
                    var waveforms = [];
                    for (i=0;i<this.amplitudes.length;i++) {
                        waveforms.push(function(time){
                            if (time<this.stepTime) {
                                return this.offset;
                            } else {
                                return this.offset+this.amplitudes[i]
                            }
                            })
                    }
                    return waveforms;
                }
            }
            //contains the inputs associated a sine input in the webform
            function sineInput(form) {
                this.channel = parseInt(form.find("select[class=funcWavelength]")[0].selectedIndex);
                this.amplitude = parseInt(form.find("input.amplitude").val()); // GS
                this.period = parseFloat(form.find("input.period").val()) * 60 * 1000; // ms
                this.phase = parseFloat(form.find("input.phase").val()) * 60 * 1000; // ms
                this.offset = parseInt(form.find("input.offset").val()); // GS
                //Check if offset+amplitude doesn't exceed bounds
                if (this.offset+Math.abs(this.amplitude)>4095||this.offset-Math.abs(this.amplitude)<0) {
                    console.log("ERROR sine  function exceeds bounds");
                }
                //returns the waveform associated with this input
                this.generateWaveforms = function() {
                    return [function(time){return this.amplitude*Math.sin(2*Math.PI*time+this.phase)+this.offset}];
                }
            }
            //TODO
            //contains the inputs associated a arb input in the webform
            function arbInput (form) {
                this.channel = parseInt(form.find("select[class=funcWavelength]")[0].selectedIndex);
                console.log($(form.find("arbTable")).handsontable('getData'));
                //returns the waveform associated with this input
                this.generateWaveforms = function() {
                    
                    return [function(time){}];
                }
            }
        }
        //Gets the intensity of an internal well number, and a channel at a given time
        this.getIntensity = function(wellNum,channel,time) {
            // This is where time-shifting occurrs. Returns intensity (GS; int).
            var sampleNum = this.samples;
            var repNum = this.replicates;
            // Use wellNum to determine which wfg to ask intensity at particular time.
            var wfg_i = Math.floor(wellNum / (repNum * sampleNum)); // well func group index
            var r_i = Math.floor((wellNum - wfg_i*sampleNum*repNum)/sampleNum);
            var time_i = wellNum - wfg_i*sampleNum*repNum - r_i*sampleNum;
            
            // Determine how much time should be shifted based on the wellNum (in ms)
            var shiftedTime = time - (plate.totalTime - this.times[time_i]);
            var gsI = this.waveformGroups[wfg_i].getIntensity(channel, shiftedTime);
            
            return gsI;
        }
        //returns the total number of wells in this wellArrangement
        this.getWellNumber = function() {
            return this.samples*this.replicates*this.waveformGroups.length;
        }
        //a grouping of waveform objects
        function WaveformGroup() {
            //An array of the waveforms contained in this group, where the index is the channel number.
            this.waveforms = [];
            //Gets the intensity of a channel at a given time
            //If waveform is undifined return zero
            this.getIntensity = function(channel,time) {
                if (typeof this.waveforms[channel] == 'undefined') {
                    return 0;
                }
                return this.waveforms[channel](time);
            }
            //adds a waveform to a given channel
            //Throws error if attempting to overwrite an existing waveform
            this.addWaveform = function(waveform,channel) {
                //If channel entry isn't empty throw error
                if (typeof this.waveforms[channel] !== 'undefined') {
                    console.log("ERROR, multiple waveforms in same channel!");
                }
                this.waveforms[channel]=waveform;
            }
            this.copy = function(){
                var newWaveformGroup = new WaveformGroup();
                newWaveformGroup.waveforms = this.waveforms.slice();
                return newWaveformGroup;
            }
        }
    }
}