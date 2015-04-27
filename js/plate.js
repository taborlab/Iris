//Contains all information for a lpf file
// Replaces LPFEncoder.js
// LPIv2.0
function Plate(data) {
    //Call parsePlate when the object is initialized
    parseInputs(this,parseInputs);
    this.timeStep = calculateBestTimestep(this); // Size of timestep in ms
    // TO DO: these might be redundant, unnecessary if we have good loadup/default handling (#default)
    this.numPts = Math.floor(this.totalTime/this.timeStep + 1); // Number of time points
    this.times = new Array(this.numPts); // List of time points
    this.timesMin = new Array(this.numPts); // Times in min
    for (var i=0; i<this.times.length; i++) {
        this.times[i] = this.timeStep * i;
        this.timesMin[i] = this.times[i]/60/1000;
    }
    console.log("Timestep set to: " + this.timeStep);
    //Parses the entirety of the webform data into a plate object
    //Returns a plate object
    function parseInputs(plate,data) {
        function shuffleArray(array) {
                for (var i = array.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = array[i];
                array[i] = array[j];
                array[j] = temp;
                }
                return array;
        };
        //Import data
        plate.rows = data.device.rows;
        plate.cols = data.device.cols;
        plate.channelNum = data.device.leds.length;
        plate.randomized = data.param.randomized;
        plate.offOnFinish = data.param.offSwitch;
        plate.wavelengths = data.param.leds;
        //Process raw form data
        plate.totalTime = Math.floor(data.param.time * 60 * 1000); // in ms
        plate.timeStep = 1000; // in ms
        plate.minimumTS = 1000; // minimum time step in ms
        plate.numPts = Math.floor(plate.totalTime/plate.timeStep + 1); // number of time points
        plate.maxGSValue = 4095;
        plate.times = new Array(plate.numPts);
        plate.timesMin = new Array(plate.numPts);
        for (var i=0; i<plate.times.length; i++) {
            plate.times[i] = plate.timeStep * i;
            plate.timesMin[i] = plate.times[i]/60/1000;
        }
        plate.steadyState = true; // All time steps will be set to the run length
        plate.hasSine = false; // Automatically sets TS to minimum value
        plate.randMatrix = new Array(plate.rows*plate.cols); // Deal with randomization
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
        // A list of all wellArrangements contained on this plate
        plate.wellArrangements=[];
        plate.experiments.each(function( index, wellArrangementForm) {
            plate.wellArrangements.push(new WellArrangement($(wellArrangementForm,plate.channelNum), plate)); // TO DO: why is there a comma in the jQuery? (", plate.channelNum")
            });
        //Check if total well number is sufficient, if it isn't throw error
        var numberOfWells=0;
        for (var i=0;i<plate.wellArrangements.length;i++) {
            numberOfWells+=plate.wellArrangements[i].getWellNumber();
        }
        if (plate.rows*plate.columns<numberOfWells) {
            console.log("ERROR TOO MANY WELLS"); // TO DO: deal with this (#errors)
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
        return plate.minimumTS;
        if (plate.totalTime > 720*60*1000) { // If > 12hr, set TS to AT LEAST 10s
            plate.minimumTS = 6000;
        }
        else {
            plate.minimumTS = 1000;
        }
        if (plate.hasSine == true) { // smooth continuous dynamic runs should use a small TS
            return plate.minimumTS;
        }
        // If all runs are constants, then TS can be set to max
        else if (plate.steadyState == true) {
            return plate.totalTime;
        }
        else {
            return plate.minimumTS;
        }
    }
    //Generates the correct LED values
    this.deviceLEDs = function() {
        var plateType = $(".devices").val();
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
        var intensities = new Uint16Array(this.buff, 32);
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
                        intensities[index]=0;
                    }
                    //Otherwise call that WellArrangement for its intensity
                    else {
                        intensities[index]=this.waPositions[randMat[well]][0].getIntensity(this.waPositions[randMat[well]][1],ch,this.times[ti]);
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
                    intensities[ind] = 0;
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
        var CSVStr = "Program Index," + "True Well Location," + "Time Points" + "\n";
        for (var i=0;i<this.rows*this.cols;i++) {
            var tp = timePoints[randMat[i]];
            var row = i + "," + randMat[i] + "," + tp + "\n";
            CSVStr += row;
        }
        var csvblob = new Blob([CSVStr], {type: "text/csv"});
        zip.file("randomizationMatrix.csv", CSVStr);
        //Save plate object for loading up later
        //var plateblob = new Blob([JSON.stringify(this)], {type: "text/csv"});
        zip.file("savefile.lpi", JSON.stringify(this));
        var content = zip.generate({type:"blob"});
        var d = new Date();
        var filename = d.getFullYear() + ("0" + (d.getMonth()+1)).slice(-2)
                       + ("0" + d.getDate()).slice(-2)
                       + "_" + d.getTime();
        saveAs(content, filename);
    }
    //Multiple waveform groups that are spread over a set of well specifications
        parseInputs(this,plate,form);
        //Parses the entirity of the data in a waveform group section of the webpage
        //returns a wellArrangenment
        function parseInputs(wellArrangement,plate,form) {
            wellArrangement.samples = parseInt(data.samples);
            wellArrangement.replicates = parseInt(data.replicates);
            wellArrangement.startTime = parseInt(data.startTime * 60 * 1000); // ms
            //wellArrangement.times = new Array(wellArrangement.samples);
            // Would implement CSV of time points here
            // For linearly spaced time INTEGER points:
            wellArrangement.times = numeric.round(numeric.linspace(wellArrangement.startTime, plate.totalTime, wellArrangement.samples));
            wellArrangement.waveformInputs=[];
            $(data.waveforms).each(function(index, waveform) {
                switch (waveform.type) {
                    case 'const':
                        wellArrangement.waveformInputs.push(new constInput(waveform))
                        break;
                    case 'step':
                        wellArrangement.waveformInputs.push(new stepInput(waveform))
                        break;
                    case 'sine':
                        wellArrangement.waveformInputs.push(new sineInput(waveform))
                        break;
                    case 'arb':
                        wellArrangement.waveformInputs.push(new arbInput(waveform))
                        break;
                    default:
                        break;
                }
            });
            //Create waveform groups, crazy recursion is needed to create all permuatations of
            //input forms which could have multiple waveforms
            wellArrangement.waveformGroups=waveformParsing(0);
            function waveformParsing(inputIndex) {
                //At the end of recursively going through the waveform inputs create a waveform group
                //make it a list and return it;
                 if (inputIndex>=wellArrangement.waveformInputs.length) {
                    return [new WaveformGroup()];
                 }
                 else {
                    var waveforms = wellArrangement.waveformInputs[inputIndex].generateWaveforms();
                    var waveformGroups = [];
                    //Loops through the group of waveforms generated by a single input
                    for (var waveformIndex=0; waveformIndex<waveforms.length;waveformIndex++) {
                        //recursively calls the next waveform input index
                        //Stores the list of waveform groups returned
                        var newWaveformGroups=waveformParsing(inputIndex+1);
                        //Add the current waveform to all the generate waveform groups
                        for(var waveformGroupIndex=0;waveformGroupIndex<newWaveformGroups.length;waveformGroupIndex++) {
                            newWaveformGroups[waveformGroupIndex].addWaveform(waveforms[waveformIndex],wellArrangement.waveformInputs[inputIndex].channel);
                        }
                        //Concate on the modifed waveform groups together
                        waveformGroups = waveformGroups.concat(newWaveformGroups);
                    }
                    //return the concated waveform groups which now have the functions generated from the current waveform index
                    //added to them.
                    return waveformGroups; 
            }
            // TO DO: IN ALL WF's: check for empty values, raise error (#errors #default)
            //contains the inputs associated a constant input in the webform
            function constInput(data) {
                this.type = data.type;
                //Process inputs
                this.amplitudes = JSON.parse("[" + data.ints + "]");
                this.amplitudes = numeric.round(this.amplitudes); // Make sure all ints are whole numbers
                this.channel = data.selected;
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
            function stepInput(data) {
                this.type = data.type;
                this.inputs = {};
                this.inputs[".funcWavelength"] = form.find(".wavelength-selector").val();
                this.inputs["input.amplitudes"] = form.find("input.ints").val();
                this.inputs["input.offset"] = form.find("input.offset").val();
                this.inputs["input.stepTime"] = form.find("input.stepTime").val();
                //Process Inputes
                this.amplitudes = JSON.parse("[" + data.ints + "]");
                this.amplitudes = numeric.round(this.amplitudes); // Make sure all amps are whole numbers
                this.offset = parseInt(data.offset);//GS
                this.stepTime = Math.floor(data.stepTime * 60 * 1000); // ms
                this.channel = parseInt(data.selected);
                //Check if step doesn't exceed max or go lower than 0
                if (this.offset>plate.maxGSValue||this.offset<0) {
                    console.log("ERROR step function exceeds bounds");
                    // TO DO: deal with this (#errors)
                }
                for (i=0;i<this.amplitudes.length;i++) {
                    if (this.offset+this.amplitudes[i]>plate.maxGSValue||this.offset+this.amplitudes[i]<0) {
                        console.log("ERROR step function exceeds bounds");
                        // TO DO: deal with this (#errors)
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
            function sineInput(data) {
                this.type = data.type;
                this.amplitude = parseInt(data.amplitude); // GS
                this.period = parseFloat(data.period) * 60 * 1000; // ms
                this.phase = parseFloat(data.phase) * 60 * 1000; // ms
                this.offset = parseInt(data.offset); // GS
                this.channel = parseInt(data.selected);
                //Check if offset+amplitude doesn't exceed bounds
                if (this.offset+Math.abs(this.amplitude)>plate.maxGSValue||this.offset-Math.abs(this.amplitude)<0) {
                    console.log("ERROR sine  function exceeds bounds");
                    // TO DO: deal with this (#errors)
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
                this.type = 'arb';
                //Parse inputs, key is a string selector, value is the .val() of that element
                this.inputs = {};
                this.inputs[".funcWavelength"] = form.find(".wavelength-selector").val();
                this.rawData = $(form.find(".arbTable")).data('handsontable').getData();
                this.intial = Number(this.rawData[0][1]);
                this.channel = parseInt(form.find("select[class=wavelength-selector]")[0].selectedIndex);
                //Transition rawData to a data array where every entry is a number tuple
                this.data = []
                for(var i=0;i<this.rawData.length;i++){
                    //If both entries in a row are numbers add it to data
                    if (this.rawData[i][0] !== null && typeof this.rawData[i][0] === "number" &&
                        this.rawData[i][1] !== null && typeof this.rawData[i][1] === "number") {
                        this.data.push([this.rawData[i][0]*60*1000,this.rawData[i][1]]);//Convert from minutes to milliseconds here
                    }
                }
                //Sort data by the timepoint
                this.data.sort(function(a,b){
                    if (a[0] < b[0]) return -1;
                    if (a[0] > b[0]) return 1;
                    return 0;
                });
                //returns the waveform associated with this input
                this.generateWaveforms = function() {
                    var waveforms = [];
                    (function(intial,data) {
                        //A index variable is declared to remember last returned index
                        //Search should begin here, likely resulting in O(1) operation
                         var index=0;
                         waveforms.push(function(time){
                            //A second recursive function so that it can call itself
                            function recursion(time) {
                                //If the time is past the time of the current index
                                if (time>=data[index][0]) {
                                    //If index is the last one in the list just return the intensity of the current index
                                    if (index>=data.length-1) {
                                        return data[index][1];
                                    }
                                    //If the time is between the current index and the next one, return the current index's intensity
                                    if (time<data[index+1][0]) {
                                        return data[index][1];
                                    }
                                    //If the time is greater than the next index and you aren't at the end of the array recurse looking at the next index
                                    else {
                                        index++;
                                        return recursion(time);
                                    }
                                }
                                //if time is less than current index traverse backwards until this is not true
                                //or until you reach begining of array, the return the intial value
                                else {
                                    if (index<=0) {
                                        return intial;
                                    }
                                    else {
                                        index--;
                                        return recursion(time);
                                    }
                                }
                            }
                            return recursion (time);
                            });
                    })(this.intial, this.data);
                    return waveforms;
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
                    // TO DO: deal with this (#errors)
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