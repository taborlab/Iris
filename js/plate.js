//Contains all information for a lpf file
// Replaces LPFEncoder.js
// LPIv2.0
function Plate(form) {
    //Call parsePlate when the object is initialized
    parseInputs(this,form);
    this.timeStep = calculateBestTimestep(this);
    this.numPts = Math.floor(this.totalTime/this.timeStep + 1);
    this.times = new Array(this.numPts);
    this.timesMin = new Array(this.numPts);
    for (var i=0; i<this.times.length; i++) {
        this.times[i] = this.timeStep * i;
        this.timesMin[i] = this.times[i]/60/1000;
    }
    console.log("Timestep set to: " + this.timeStep);
    tsbox = form.find('#timestep');
    tsbox.val(this.timeStep/1000);
    //Parses the entirity of the webform data into a plate object
    //Returns a plate object
    function parseInputs(plate,form) {
        plate.rows = form.find("#rows").val();
        plate.cols = form.find("#columns").val();
        plate.channelNum=form.find("#LEDnum").val();
        plate.totalTime = Math.floor(form.find("#length").val() * 60 * 1000); // in ms
        plate.timeStep = form.find("#timestep").val() * 1000; // in ms
        plate.minimumTS = 1000; // ms -- minimum time step
        // Allow for user inputs of TS -- if larger than minimum, update the minimum
        if (plate.minimumTS < plate.timeStep) {
            // Might want to warn user of this
            console.log("Warning: Input time step has increased the minimum step size from the default.");
            plate.minimumTS = plate.timeStep;
        }
        else if (plate.minimumTS > plate.timeStep) {
            console.log("Warning: Initial tme step set lower than minimum. Raised to " + plate.minimumTS + "ms.");
        }
        plate.numPts = Math.floor(plate.totalTime/plate.timeStep + 1);
        plate.maxGSValue = 4095;
        plate.times = new Array(plate.numPts);
        plate.timesMin = new Array(plate.numPts);
        for (var i=0; i<plate.times.length; i++) {
            plate.times[i] = plate.timeStep * i;
                plate.timesMin[i] = plate.times[i]/60/1000;
        }
        plate.randomized = form.find("#randomized").is(':checked');
        plate.offOnFinish = form.find("#offSwitch").is(':checked');
        plate.steadyState = true; // All time steps will be set to the run length
        plate.hasSine = false; // Automatically sets TS to minimum value
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
        plate.randMatrix = new Array(plate.rows*plate.cols);
        for (i=0; i<plate.rows*plate.cols; i++) {
            plate.randMatrix[i] = i;
        }
        if (plate.randomized == true) { // randMatrix must be shuffled
            plate.randMatrix = shuffleArray(plate.randMatrix);
        }
        this.timePoints = numeric.rep([plate.rows*plate.cols],-1); // initialize array containing the time points for each tube
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
        //Create a lookup that for a specific well number there is an associated WellArrangement
        //and position in WellArrangement
        //Columns and rows are flattened into one dimension
        plate.waPositions = [];
        var position=0;
        for(var wa=0;wa<plate.wellArrangements.length;wa++) {
            //If it has waveform groups
            if (plate.wellArrangements[wa].waveformGroups.length !== 0) {
                for (var i=0;i<plate.wellArrangements[wa].getWellNumber();i++) {
                    plate.waPositions[position] = [plate.wellArrangements[wa],i];
                    position++;
                }
            }
        }
    }
    // Sets timestep to largest possible to optimize speed & LPF size
    function calculateBestTimestep(plate) {
        // Pull all timepoints from wellArrangements.
        // If any sine waves are encountered, timeStep is automatically set to 10s
        // (Continuous-ish)
        //return plate.minimumTS; // turning off TS calculation for now; incomplete
        if (plate.totalTime > 480*60*1000) { // If > 8hr, set TS to AT LEAST 10s
            if (plate.minimumTS < 10000) {
                plate.minimumTS = 10000;
            }
        }
        if (plate.hasSine == true) { // smooth continuous dynamc runs should use a small TS
            return plate.minimumTS;
        }
        // If all runs are constants, then TS can be set to max
        else if (plate.steadyState == true) {
            return plate.totalTime;
        }
        
        var timePoints = [];
        for (var wa=0; wa<plate.wellArrangements.length; wa++) {
            // Things that affect the timestep include data time points:
            for (var tp=0; tp<plate.wellArrangements[wa].times.length; tp++) {
                timePoints.push(plate.wellArrangements[wa].times[tp]);
            }
            // Also any times at which the light signal is changing.
            // TO ADD after ARB is done (spreadsheet)
        }
        // Sort the time points
        console.log("timePoints: " + timePoints);
        timePoints = timePoints.sort(function(a,b){return a-b});
        console.log("sorted timePoints: " + timePoints);
        // Calculate delta t
        var diffs = [];
        for (var di=0; di<timePoints.length; di++) {
            var diff = timePoints[di+1] - timePoints[di];
            if (diff > 0) {
                diffs.push(diff);
            }
        }
        // Define GCD calculation (via rosettacode.org)
        function GCD(A) { // Accepts integer array
            var n = A.length, x = A[0] < 0 ? -A[0] : A[0];
            for (var i = 1; i < n; i++){
                var y = A[i] < 0 ? -A[i] : A[i];
                while (x && y){ x > y ? x %= y : y %= x; }
                x += y;
            }
            return x;
        }
        var maxTS = plate.totalTime; // Maximum TS possible is the length of the run
        var tsGCD = GCD(diffs);
        console.log("tsGCD: " + tsGCD);
        if (tsGCD < maxTS) {
            maxTS = tsGCD;
        }
        for (var di=0; di<diffs.length; di++) { // Validation; could be removed later
            if (diffs[di] % maxTS != 0) {
                console.log("ERROR: selected time step not actually divisible.");
            }
        }
        if (maxTS > plate.minimumTS && maxTS%1000==0) { // Might be too strict
            return maxTS
        }
        else {
            return plate.minimumTS;
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
        wellNum = this.randMatrix[wellNum];
        var timesMin = this.timesMin;
        var timesMS = this.times;
        var timeCourses = new Array(this.channelNum);
        var ti = 0;
        if (this.waPositions[wellNum] === undefined) {
            for (var ch=0; ch<this.channelNum; ch++) {
                timeCourses[ch] = new Array(this.numPts);
                for (ti=0; ti<this.numPts; ti++) {
                    timeCourses[ch][ti] = {x:timesMin[ti], y:0};
                }
            }
        }
        else {
            for (var ch=0; ch<this.channelNum; ch++) {
                timeCourses[ch] = new Array(this.numPts);
                for (ti=0; ti<this.numPts; ti++) {
                    timeCourses[ch][ti] = {x:timesMin[ti], y:this.waPositions[wellNum][0].getIntensity(this.waPositions[wellNum][1],ch,timesMS[ti])}; // Passes a wellNum RELATIVE TO THE WA};
                }
            }
        }
        return timeCourses;
    }
    // Returns a w x c array of intensities where w is wellNumber and c is channel num
    // NOTE: The input is an **index** in plate.times (length: plate.numSteps)
    this.createPlateView = function(timeIndex) {
        var randMat = this.randMatrix;
        var wellSnapshot = new Array(this.rows);
        for (var r=0; r<this.rows; r++) {
            wellSnapshot[r] = new Array(this.cols);
            for (var c=0; c<this.cols; c++) {
                wellSnapshot[r][c] = new Array(this.channelNum);
                for (var ch=0; ch<this.channelNum; ch++) {
                    if (this.waPositions[randMat[r*this.cols+c]] === undefined) {
                        wellSnapshot[r][c][ch]=0;
                    }
                    else {
                        wellSnapshot[r][c][ch] = this.waPositions[randMat[r*this.cols+c]][0].getIntensity(this.waPositions[randMat[r*this.cols+c]][1],ch,this.times[timeIndex])
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
        // Initialize all variables to be used in for loops for efficiency
        this.intensities = new Uint16Array(this.buff, 32);
        var plateSize = this.rows*this.cols;//Number of wells on a plate
        var index=0;//Index in byte array
        var well=0;//Looping variable for wells
        var ch=0;//Looping variable for channels
        var numberPoints = this.numPts;//For looping efficiency
        var chanNum = Math.floor(this.channelNum)//Super janky way to remove what ever was making this variable super slow
        var randMat = this.randMatrix;
        //Loop through timepoints, wells, channels
        //Use precomputed relationship of well->wellArrangement
        for (var ti=0; ti<numberPoints; ti++) {
            for(well=0;well<plateSize;well++) {
                for (ch=0; ch<chanNum; ch++) {
                    //If there is no WellArrangement for this well set channel to 0
                    if (randMat[well]>=this.waPositions.length) {
                        this.intensities[index]=0;
                    }
                    //Otherwise call that WellArrangement for its intensity
                    else {
                        this.intensities[index]=this.waPositions[randMat[well]][0].getIntensity(this.waPositions[randMat[well]][1],ch,this.times[ti]);
                    }
                    index++;
                }
            }
        }        
        // Write LPF (zipped folder)
        var stepInIndex = this.rows * this.cols * this.channelNum;
        if (this.offOnFinish && !this.steadyState) {
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
                timePoints[tpi] = this.wellArrangements[wa].times[waWell];
                tpi += 1;
            }
        }
    var CSVStr = "Well Number," + "Randomized Index," + "Time Points" + "\n";
    for (var i=0;i<this.rows*this.cols;i++) {
        var tp = timePoints[i];
        var row = i + "," + randMat[i] + "," + tp + "\n";
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
        parseInputs(this,plate,form);
        //Parses the entirity of the data in a waveform group section of the webpage
        //returns a wellArrangenment
        function parseInputs(wellArrangement,plate,form) {
            wellArrangement.samples = parseInt(form.find("input.samples").val());
            wellArrangement.replicates = parseInt(form.find("input.replicates").val());
            wellArrangement.startTime = parseInt(form.find("input.startTime").val() * 60 * 1000); // ms
            //wellArrangement.times = new Array(wellArrangement.samples);
            // Would implement CSV of time points here
            // For algorithmic (linearly spaced) time INTEGER points:
            wellArrangement.times = numeric.round(numeric.linspace(wellArrangement.startTime, plate.totalTime, wellArrangement.samples));
            
            wellArrangement.waveformInputs=[];
            form.find(".func").not(".template").each(function(index, waveform) {
                var newWaveform;
                waveform = $(waveform);
                if (waveform.hasClass("const")) {
                    newWaveform = new constInput(waveform);
                }else if (waveform.hasClass("step")) {
                    newWaveform = new stepInput(waveform);
                    plate.steadyState = false;
                }else if (waveform.hasClass("sine")) {
                    newWaveform = new sineInput(waveform);
                    plate.hasSine = true;
                    plate.steadyState = false;
                }else if (waveform.hasClass("arb")) {
                    newWaveform = new arbInput(waveform);
                    plate.steadyState = false;
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
                    for (var i=0;i<this.amplitudes.length;i++) {
                        (function(amp) {waveforms.push(function(time){return amp})})(this.amplitudes[i]);
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
                        (function(amp,offset,stepTime) {
                            waveforms.push(function(time){
                                if (time<stepTime) {
                                    return offset;
                                } else {
                                    return offset+amp
                                }
                            });
                        })(this.amplitudes[i],this.offset,this.stepTime);
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
                    var waveforms = [];
                    (function(amp,phase,period,offset) {
                        waveforms.push (function(time){return Math.round(amp*Math.sin(2*Math.PI*(time-phase)/period)+offset)});
                    })(this.amplitude, this.phase, this.period, this.offset);
                    return waveforms;
                }
            }
            //TODO
            //contains the inputs associated a arb input in the webform
            function arbInput (form) {
                this.channel = parseInt(form.find("select[class=funcWavelength]")[0].selectedIndex);
                //returns the waveform associated with this input
                this.generateWaveforms = function() {
                    
                    return [function(time){}];
                }
            }
            // Calculate time shift parameters for each well in arrangement (will hopefully accelerate computation)
            var wellNumber = wellArrangement.samples*wellArrangement.replicates*wellArrangement.waveformGroups.length;
            wellArrangement.wfg_i = new Array(wellNumber); // well func group index
            wellArrangement.time_i = new Array(wellNumber); // index in time step times (index for list of time points in ms)
            for (var wn=0; wn<wellNumber; wn++) {
                wellArrangement.wfg_i[wn] = Math.floor(wn / (wellArrangement.replicates * wellArrangement.samples));
                var r_i = Math.floor((wn - wellArrangement.wfg_i[wn]*wellArrangement.samples*wellArrangement.replicates)/wellArrangement.samples);
                wellArrangement.time_i[wn] = wn - wellArrangement.wfg_i[wn]*wellArrangement.samples*wellArrangement.replicates - r_i*wellArrangement.samples;
            }
        }
        //Gets the intensity of an internal well number, and a channel at a given time
        this.getIntensity = function(wellNum,channel,time) {            
            // Determine how much time should be shifted based on the wellNum (in ms)
            return this.waveformGroups[this.wfg_i[wellNum]].getIntensity(channel, time - (plate.totalTime - this.times[this.time_i[wellNum]]));
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