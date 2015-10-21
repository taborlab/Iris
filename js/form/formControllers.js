//Grab module
var app = angular.module('LPI', ['ngHandsontable', '720kb.tooltips']);
app.config(function(tooltipsConfigProvider) {
     tooltipsConfigProvider.options({
         lazy: true,
         side: 'right'
     })
 });
//Controller for the form
app.controller('formController',['$scope', '$timeout','formData','plate', function($scope,$timeout,formData,plate) {

    // =================================================================================================================
    // Hooks for HTML

    //Holds the current display state of the form
    $scope.display={};

    $scope.formData = formData;

    //Fetches the device from the Data service
    $scope.device = formData.getData().device;

    //Janky fix for Custom LED resizing
    $scope.cssRefresh=false;

    $scope.updateDevice = function(value){formData.setDevice(value);};

    //Fetches the experiments from the Data service
    $scope.getExperiments = function() { return formData.getExperiments()};

    $scope.deleteExperiment = function(experiment){
        var index = $scope.getExperiments().indexOf(experiment);
        if(index>-1) {
            $scope.getExperiments().splice(index, 1);
        }
    };

    $scope.addExperiment = function(){
        var newExperiment = new Experiment($scope.deleteExperiment, $scope.getWellDomain);
        $scope.getExperiments().push(newExperiment);
        return newExperiment;
    };

    //Utility function to repeat X number of times,
    $scope.getNumber = function(num) {
        return new Array(num);
    };

    // Calculates the number of wells (inclusive) used in a partuicluar experiment
    // Indexes at 1
    // Returns empty strings if form data is in an invalid state
    $scope.getWellDomain = function(experiment) {
        if (!formData.isValid()){
            return {'low': "_", 'high':"_"}
        }
        var wells = 0;
        for (var i=0; i<$scope.getExperiments().length; i++) {
            var currExpWellCount = $scope.getExperiments()[i].getWellCount();
            if ($scope.getExperiments()[i] == experiment) {
                return {'low': wells + 1, 'high':wells+currExpWellCount};
            }
            else {
                wells = wells + currExpWellCount;
            }
        }
        return currExpWellCount;
    };

    //Gets a new random seed for the random number generator, used when randomize is checked
    $scope.newSeed = function(){
        formData.getParam().seed=Math.random().toString();
    }

    //Downloads the plate
    $scope.downloadPlate = function(){
        plate.get().createLPF();
    };

    //Handles uploading the savefiles
    $scope.file_changed = function(element) {
        var file  = element.files[0];
        var reader = new FileReader();
        reader.onload = function(e) {
            //Get the data and parse it to an object
            var newData = JSON.parse(e.target.result)
            $scope.$apply(function() {
                //Change the name of the loaded device
                newData.device.name = newData.device.name;
                newData.device.uploaded = true;
                //Add the loaded device to the device menu
                $scope.devices.push(newData.device);
                //Set device and parameters
                formData.setDevice(newData.device);
                formData.setParam(newData.param);
                formData.getData().experiments=[];
                for (var i = 0; i < newData.experiments.length; i++) {
                    var oldExperiment = newData.experiments[i];
                    var newExperiment = $scope.addExperiment();
                    newExperiment.replicates = oldExperiment.replicates;
                    newExperiment.samples = oldExperiment.samples;
                    newExperiment.startTime = oldExperiment.startTime;
                    newExperiment.timepoints = oldExperiment.timepoints;
                    for (var j = 0; j < oldExperiment.waveforms.length; j++) {
                        var oldWaveform = oldExperiment.waveforms[j];
                        var newWaveform = newExperiment.addWaveform(oldWaveform.type);
                        //Set all the variables, if they are undefined in the save, this won't do anything
                        newWaveform.ints = oldWaveform.ints;
                        newWaveform.offset = oldWaveform.offset;
                        newWaveform.stepTime = oldWaveform.stepTime;
                        newWaveform.period = oldWaveform.period;
                        newWaveform.phase = oldWaveform.phase;
                    }
                }
                //Set the active device to the loaded device
                $scope.device = formData.getData().device;
            });
            //Change the name of the loaded device
            newData.device.name = newData.device.name;
            newData.device.uploaded = true;
            //Add the loaded device to the device menu
            $scope.devices.push(newData.device);
            //Set device and parameters
            formData.setDevice(newData.device);
            formData.setParam(newData.param);
            formData.getData().experiments=[];
            for (var i = 0; i < newData.experiments.length; i++) {
                var oldExperiment = newData.experiments[i];
                var newExperiment = $scope.addExperiment();
                newExperiment.replicates = oldExperiment.replicates;
                newExperiment.samples = oldExperiment.samples;
                newExperiment.startTime = oldExperiment.startTime;
                newExperiment.timepoints = oldExperiment.timepoints;
                for (var j = 0; j < oldExperiment.waveforms.length; j++) {
                    var oldWaveform = oldExperiment.waveforms[j];
                    var newWaveform = newExperiment.addWaveform(oldWaveform.type);
                    //An apply is required to trigger the Wavelength LED ng-init dropdown, since it overwrites the value
                    //stored in the following line to wavelengthIndex
                    $scope.$apply();
                    //Set all the variables, if they are undefined in the save, this won't do anything
                    newWaveform.wavelengthIndex = oldWaveform.wavelengthIndex;
                    newWaveform.ints = oldWaveform.ints;
                    newWaveform.offset = oldWaveform.offset;
                    newWaveform.stepTime = oldWaveform.stepTime;
                    newWaveform.period = oldWaveform.period;
                    newWaveform.phase = oldWaveform.phase;
                    newWaveform.amplitude = oldWaveform.amplitude;
                }
            }
            //Set the active device to the loaded device
            $scope.device = formData.getData().device;
            $scope.$apply();
        };
        reader.readAsText(file);
    };

    //Resets the file when the file upload button is clicked
    //This allows you to reupload the same file repeatedly and still trigger the onChange event
    $scope.file_clicked = function(element) {
        element.value=null;
    }

    //Prepends "Uploaded: " to uploaded device names in dropdown
    $scope.deviceName = function(device) {
        if(device.uploaded) {
            return "Uploaded: "+device.name;
        }
        else {
            return device.name
        }
    }

    // =================================================================================================================
    //Functions to watch and update the state of the display

    //Loads devices from file, runs asynchronously
    $.getJSON("data/devices.json", function(json) {
        $scope.devices = json;
        //Super hacky solution which forces CSS update of LED fields to calculate size correctly
        $scope.$watch('ledNum', function() {
            $timeout(function(){
                $scope.cssRefresh=!$scope.cssRefresh;
                $timeout(function(){
                    $scope.cssRefresh=!$scope.cssRefresh;
                },10);
            },10);
        });
        $scope.devicesLoaded=true;
        updateDisplay()
    });

    //Modifies the length of the LEDs array based on the ledNum variable
    $scope.$watch('ledNum',function() {
        //Modifies length of leds array to match ledNum if ledNum is a valid number
        if($scope.ledNum%1 === 0 && $scope.ledNum > 0) {
            $scope.device.leds.length = $scope.ledNum;
        }
    });

    //Called when any data is changed
    $scope.getData = formData.getData;
    $scope.$watch('getData()', function() {
        updateValidation();
        if ($scope.inputsValid) {
            try {
                plate.set(new Plate(formData.getData()));
            }
            catch(err) {
                console.log(err);
                console.log("Caught plate creation error");
            }
        }
        updateDisplay();
    }, true);

    //Updates the current display state of the form
    function updateDisplay () {
        //If the devices have been loaded display the device menu
        if(!$scope.devicesLoaded){
            $scope.display.deviceSelection = 'none';
        }
        else {
            $scope.display.deviceSelection = 'block';
        }
        //If a device has been selected display the run parameters and experiment
        if($scope.device===undefined || $scope.device.name=="default") {
            $scope.display.runVariables = 'none';
        }
        else {
            $scope.display.runVariables = 'block';
        }
        //Check if device is selected and if an experiment is added, then toggle on the download button
        if($scope.device!==undefined && $scope.device.name!="default" && formData.getData().experiments.length>0 && $scope.inputsValid){
            $scope.display.download = 'block';
        }
        else {
            $scope.display.download = 'none';
        }
    }

    // =================================================================================================================
    // Objects

    //A waveform object
    function Waveform(waveformType,waveforms){
        this.type=waveformType;
        this.file = 'html/'+this.type+'.html';
        this.deleteWaveform = function (){
            var index = waveforms.indexOf(this);
            if(index>-1) {
                waveforms.splice(index, 1);
            }
        };
        // Counts the number of waveforms this WFG will make
        this.countWaveforms = function (){
            if (this.type == 'const' || this.type == 'step') {
                if (this.ints == undefined) {
                    // Default state; nothing entered yet
                    return 1;
                }
                else {
                    return JSON.parse("[" + this.ints + "]").length;
                }
            }
            else {
                return 1;

            }
        };
    }
    //An experiment object
    function Experiment(deleteExperiment, getWellDomain) {
        this.waveforms = [];
        this.deleteExperiment = function (){deleteExperiment(this)};
        this.getWellDomain = function (){return getWellDomain(this)};
        this.addWaveform = function(waveformType){
            var newWaveform = new Waveform(waveformType,this.waveforms);
            this.waveforms.push(newWaveform);
            return newWaveform;
        };
        // Count the number of wells required for this experiment for indicators
        this.getWellCount = function(){
            var replicates = parseInt(this.replicates) || 1;
            var samples = parseInt(this.samples) || 1;
            try {
               var timepoints = JSON.parse('[' + this.timepoints + ']');
               if (timepoints.length == 0) {var wells = replicates * samples;}
               else {var wells = timepoints.length * replicates;}
            }
            catch (err) {
               var wells = replicates * samples;
            }
            for (var i=0; i<this.waveforms.length; i++) {
               if (this.pairing == 'combine') {
                    wells = wells * this.waveforms[i].countWaveforms();
               }
               else { // add inputs
                    if (i == 0) {
                         wells = wells * this.waveforms[i].countWaveforms();
                    }
               }
            }
            return wells;
        };
    }

    // =================================================================================================================
    // Validation Functions

    //Initializes variables on page load
    updateValidation();

    // Loops through form hierarchy and creates error objects containing:
    //      1. boolean -- whether the particular error has occurred
    //      2. str -- text describing the nature of the error (which will be applied to the tooltip)
    $scope.inputsValid = true;
    function updateValidation() {
        $scope.inputsValid = true;
        // First, iterate through all data elements and determine which errors are present.
        //  Set their .valid elements to false
        var totalWellNum = $scope.device.rows * $scope.device.cols;
        var totalWellsUsed = 0;
        formData.getData().InsufficientWellsError = {};
        formData.getData().InsufficientWellsError.valid = true;
        formData.getData().InsufficientWellsError.text = 'Experiments must not specify more than ' + totalWellNum + ' wells.';
        var totalTime;
        formData.getData().timeFormatError = {};
        formData.getData().timeFormatError.valid = true;
        formData.getData().timeFormatError.text = 'Input time must be a positive number less than 7200.';
        try {
            totalTime = Math.floor(parseFloat(formData.getData().param.time) * 60) * 1000;
            if (isNaN(totalTime) || totalTime < 0 || totalTime > 7200*60*1000) {
                formData.getData().timeFormatError.valid = false;
                $scope.inputsValid = false;
            }
            else {formData.getData().timeFormatError.valid = true;}
        }
        catch (err) {
            formData.getData().timeFormatError.valid = false;
            $scope.inputsValid = false;
        }

        // Check each experiment
        for(var i=0; i<formData.getData().experiments.length; i++) {
            var experiment  = formData.getData().experiments[i];
            var wfchannels = []; // Will hold a list of all channel indices for each waveform to check for redundancy
            experiment.timepointsValid = true;
            experiment.wellsUsed = -1;
            experiment.isSteadyState = true; // True when all waveforms are const (experiment has no dynamic component & waveforms can be added).
            // If waveforms are added, check they all have the same length.
            experiment.addWaveformsLength = 0;
            experiment.addWaveformsLengthError = {};
            experiment.addWaveformsLengthError.valid = true;
            experiment.addWaveformsLengthError.text = 'Added waveforms must all have the same number of intensities.';
            // Check # Evenly Spaced Timepoints
            var numTimepoints;
            experiment.numTimepointsFormatError = {}
            experiment.numTimepointsFormatError.valid = true;
            experiment.numTimepointsFormatError.text = 'Must specify a positive integer less than the number of wells.';
            try {
                numTimepoints = parseInt(experiment.samples);
                if (isNaN(numTimepoints) || numTimepoints > totalWellNum || numTimepoints < 1) {
                    experiment.numTimepointsFormatError.valid = false;
                    experiment.timepointsValid = false;
                }
            }
            catch (err) {
                experiment.numTimepointsFormatError.valid = false;
                experiment.timepointsValid = false;
            }
            // Check Delay
            var delay;
            experiment.delayFormatError = {}
            experiment.delayFormatError.valid = true;
            experiment.delayFormatError.text = 'Must be a positive number less than the total experiment length.';
            try {
                delay = Math.floor(parseFloat(experiment.startTime * 60) * 1000);
                if (isNaN(delay) || delay < 0 || delay >= totalTime || experiment.startTime.replace(/\s/g, "").length == 0) {
                    experiment.delayFormatError.valid = false;
                    experiment.timepointsValid = false;
                }
            }
            catch (err) {
                experiment.delayFormatError.valid = false;
                experiment.timepointsValid = false;
            }
            experiment.ESTPvalid = (experiment.numTimepointsFormatError.valid && experiment.delayFormatError.valid)
            // Check custom timepoints CSV
            var customTimepoints; // will hold intensity CSV list
            experiment.timepointsCSVFormatError = {}
            experiment.timepointsCSVFormatError.valid = true;
            experiment.timepointsCSVFormatError.text = 'Must be a comma separated list of positive numbers.';
            experiment.timepointsCSVLengthError = {};
            experiment.timepointsCSVLengthError.valid = true;
            experiment.timepointsCSVLengthError.text = 'Must have at least one intensity, and the total number cannot be greater than the number of wells.';
            experiment.timepointFormatError = {};
            experiment.timepointFormatError.valid = true;
            experiment.timepointFormatError.text = 'Timepoints must be numbers between 0 and the total program duration.';
            // try parsing the intensity CSV
            try {
                customTimepoints = JSON.parse('['+experiment.timepoints+']');
                experiment.timepointsCSVFormatError.valid = true;
                if (customTimepoints.length == 0) {
                    experiment.timepointsCSVLengthError.valid = false; // default error text
                    experiment.timepointFormatError.valid = true; // default
                    experiment.timepointsValid = false;
                }
                else if (customTimepoints.length > 0 && customTimepoints.length <= totalWellNum) { // valid number of wells used
                    experiment.timepointsCSVLengthError.valid = true;
                    var timepointOutOfBounds = false;
                    for (var vali=0; vali<customTimepoints.length; vali++) {
                        if ((customTimepoints[vali] < 0 || customTimepoints[vali]*60*1000 > totalTime) && !timepointOutOfBounds) {timepointOutOfBounds = true;} // ints[vali] is outside the valid range
                    }
                    if (timepointOutOfBounds) {
                        experiment.timepointFormatError.valid= false;
                        experiment.timepointsValid = false;
                    }
                    else {experiment.timepointFormatError.valid = true;}
                }
                else { // length of ints is > num wells (too large)
                    experiment.timepointsCSVLengthError.valid = false;
                    experiment.timepointsCSVLengthError.text = 'Must have fewer timepoints than total wells.\nCurrently have '+customTimepoints.length+'/'+totalWellNum+'.';
                    experiment.timepointFormatError.valid = true; // default
                    experiment.timepointsValid = false;
                }
            }
            catch (err) { // if it can't be parsed, mark CSV as invlid and all other errors as valid (cannot be tested; valid by default)
                experiment.timepointsCSVFormatError.valid = false;
                experiment.timepointsCSVLengthError.valid = true;
                experiment.timepointFormatError.valid = true;
                experiment.timepointsValid = false;
            }
            experiment.TPCSVvalid = (experiment.timepointsCSVFormatError.valid  && experiment.timepointsCSVLengthError.valid && experiment.timepointFormatError.valid);
            // Next level:  check the total number of timepoints specified and choose which to use: custom timepoints or evenly spaced
            // If # timepoints, custom timepoints CSV, and delay all valid, mark all invalid
            // --> Can only specify ONE: evenly spaced or custom timepoints
            experiment.allTimepointsValidError = {}
            experiment.allTimepointsValidError.valid = true;
            experiment.allTimepointsValidError.text = 'Cannot specify both equally-spaced and custom time points. Remove redundant inputs.';
            experiment.redundantESTPError = {}
            experiment.redundantESTPError.valid = true;
            experiment.redundantESTPError.text = 'Custom Timepoints appear to be selected - this information is redundant.';
            experiment.redundantDelayError = {}
            experiment.redundantDelayError.valid = true;
            experiment.redundantDelayError.text = 'Custom Timepoints appear to be selected - this information is redundant.';
            experiment.redundantCSVError = {}
            experiment.redundantCSVError.valid = true;
            experiment.redundantCSVError.text = 'Evenly Spaced Timepoints appear to be selected - this information is redundant.';
            if (experiment.timepointsValid) { // All TP fields valid; this is ambiguous
               experiment.allTimepointsValidError.valid = false;
               $scope.inputsValid = false;
            }
            else if (experiment.TPCSVvalid && !experiment.ESTPvalid) { // Custom TPs selected but possible errors on even TP fields
               experiment.wellsUsed = customTimepoints.length;
               if (experiment.samples !== undefined && experiment.samples !== '') { // Other TP info entered; form invalid
                    experiment.redundantESTPError.valid = false;
                    $scope.inputsValid = false;
                    experiment.wellsUsed = 0;
               }
               if (experiment.startTime !== undefined && experiment.startTime !== '') {
                    experiment.redundantDelayError.valid = false;
                    $scope.inputsValid = false;
                    experiment.wellsUsed = 0;
               }

            }
            else if (experiment.ESTPvalid && !experiment.TPCSVvalid) { // Equally-Spaced Time Points valid, but CSV invalid
               experiment.wellsUsed = numTimepoints;
               if (experiment.timepoints !== undefined && experiment.timepoints !== '') {
                    experiment.redundantCSVError.valid = false;
                    $scope.inputsValid = false;
                    experiment.wellsUsed = 0;
               }
            }
            else {
               $scope.inputsValid = false;
               experiment.wellsUsed = 0;
            }

            // Check replicates
            var replicates;
            experiment.replciatesFormatError = {};
            experiment.replciatesFormatError.valid = true;
            experiment.replciatesFormatError.text = 'Must be a positive non-zero integer less than the number of wells.';
            try {
                replicates = parseInt(experiment.replicates);
                if (isNaN(replicates) || replicates <= 0 || replicates > totalWellNum) {
                    experiment.replciatesFormatError.valid = false;
                    $scope.inputsValid = false;
                    experiment.wellsUsed = experiment.wellsUsed * 0;
                }
                else {
                    experiment.wellsUsed = experiment.wellsUsed * replicates;
                }
            }
            catch (err) {
                experiment.replciatesFormatError.valid = false;
                $scope.inputsValid = false;
                experiment.wellsUsed = experiment.wellsUsed * 0;
            }

            // Check each waveform
            for(var j = 0; j < experiment.waveforms.length; j++) {
                var waveform = experiment.waveforms[j];
                // Check using unique LED:
                waveform.LEDSelectionError = {};
                waveform.LEDSelectionError.valid = true;
                waveform.LEDSelectionError.text = 'An LED may only be used by one waveform in an experiment.';
                for(var wfchi=0; wfchi<wfchannels.length; wfchi++) {
                    if (wfchannels[wfchi] == waveform.wavelengthIndex) { // LED already in use
                        // Mark BOTH waveforms invalid
                        waveform.LEDSelectionError.valid = false;
                        experiment.waveforms[wfchi].LEDSelectionError.valid = false;
                        $scope.inputsValid = false;
                    }
                }
                wfchannels.push(waveform.wavelengthIndex);
                // Check waveform-specific parameters:
                switch (waveform.type) { // check each waveform
                    case 'const':
                        // Define all possible errors for this waveform:
                        waveform.intsCSVFormatError = {};
                        waveform.intsCSVFormatError.valid = true;
                        waveform.intsCSVFormatError.text = 'Must be a comma separated list of valid integers.';
                        waveform.intCSVLengthError = {};
                        waveform.intCSVLengthError.valid = true;
                        waveform.intCSVLengthError.text = 'Must have at least one intensity.';
                        waveform.intFormatError = {};
                        waveform.intFormatError.valid = true;
                        waveform.intFormatError.text = 'Intensities must be integer values in the range [0,4095].';
                        var ints; // will hold intensity CSV list
                        // try parsing the intensity CSV
                        try {
                            ints = JSON.parse('['+waveform.ints+']');
                            waveform.intsCSVFormatError.valid = true;
                            if (ints.length == 0) {
                                waveform.intCSVLengthError.valid = false; // default error text
                                waveform.intFormatError.valid = true; // default
                                $scope.inputsValid = false;
                                experiment.wellsUsed = experiment.wellsUsed * 0;
                            }
                            else if (ints.length > 0 && ints.length <= totalWellNum) { // valid number of wells used
                                waveform.intCSVLengthError.valid = true;
                                // Check for integer values in correct range:
                                var ints_rounded = numeric.round(ints);
                                var hasFloat = false; // may want to separate these later?
                                var intOutOfBounds = false;
                                for (var vali=0; vali<ints.length; vali++) {
                                    if (ints[vali] != ints_rounded[vali] && !hasFloat) {hasFloat = true;} // ints[vali] is not an integer
                                    if ((ints_rounded[vali] < 0 || ints_rounded[vali] > 4095) && !intOutOfBounds) {intOutOfBounds = true;} // ints[vali] is outside the valid range
                                }
                                if (intOutOfBounds || hasFloat) {
                                    waveform.intFormatError.valid = false;
                                    $scope.inputsValid = false;
                                    experiment.wellsUsed = experiment.wellsUsed * 0;
                                }
                                else if (experiment.isSteadyState && experiment.pairing == 'add') {
                                   waveform.intFormatError.valid = true;
                                   if (experiment.addWaveformsLength == 0) { // First, possibly only, const WF
                                        experiment.addWaveformsLength = ints.length;
                                        experiment.wellsUsed = experiment.wellsUsed * ints.length;
                                   }
                                   else {
                                        if (experiment.addWaveformsLength != ints.length) { // All added waveforms must have the same length
                                             experiment.addWaveformsLengthError.valid = false;
                                             $scope.inputsValid = false;
                                        }
                                   }
                                }
                                else { // Const waveform is being *combined* with 0 or more other WFs
                                   waveform.intFormatError.valid = true;
                                   experiment.wellsUsed = experiment.wellsUsed * ints.length;
                              }
                            }
                            else { // length of ints is > num wells (too large)
                                waveform.intCSVLengthError.valid = false;
                                waveform.intCSVLengthError.text = 'Must have fewer intensities than total wells.\nCurrently have '+ints.length+'/'+totalWellNum+'.';
                                waveform.intFormatError.valid = true; // default
                                $scope.inputsValid = false;
                                experiment.wellsUsed = experiment.wellsUsed * 0;
                            }
                        }
                        catch (err) { // if it can't be parsed, mark CSV as invlid and all other errors as valid (cannot be tested; valid by default)
                            waveform.intsCSVFormatError.valid = false;
                            waveform.intCSVLengthError.valid = true;
                            waveform.intFormatError.valid = true;
                            $scope.inputsValid = false;
                            experiment.wellsUsed = experiment.wellsUsed * 0;
                        }
                        break;
                    case 'step':
                        experiment.isSteadyState = false;
                        // List of all possible errors for this waveform:
                        waveform.intsCSVFormatError = {};
                        waveform.intsCSVFormatError.valid = true;
                        waveform.intsCSVFormatError.text = 'Must be a comma separated list of valid integers.';
                        waveform.intCSVLengthError = {};
                        waveform.intCSVLengthError.valid = true;
                        waveform.intCSVLengthError.text = 'Must have at least one intensity.';
                        waveform.intFormatError = {};
                        waveform.intFormatError.valid = true;
                        waveform.intFormatError.text = 'Intensities must be integer values in the range [0,4095].';
                        waveform.offsetFormatError = {};
                        waveform.offsetFormatError.valid = true;
                        waveform.offsetFormatError.text = 'Must be an integer in the range [0,4095].';
                        waveform.stepTimeFormatError = {};
                        waveform.stepTimeFormatError.valid = true;
                        waveform.stepTimeFormatError.text = 'Must be a number between 0 and program duration.';
                        waveform.intOffsetSumError = {};
                        waveform.intOffsetSumError.valid = true;
                        waveform.intOffsetSumError.text = 'Sum of offset & each amplitude must be a valid integer in [0,4095].';
                        var ints; // will hold intensity CSV list
                        // try parsing the intensity CSV
                        try {
                            ints = JSON.parse('['+waveform.ints+']');
                            waveform.intsCSVFormatError.valid = true;
                            if (ints.length == 0) {
                                waveform.intCSVLengthError.valid = false; // default error text
                                waveform.intFormatError.valid = true; // default
                                $scope.inputsValid = false;
                                experiment.wellsUsed = experiment.wellsUsed * 0;
                            }
                            else if (ints.length > 0 && ints.length <= totalWellNum) { // valid number of wells used
                                waveform.intCSVLengthError.valid = true;
                                // Check for integer values in correct range:
                                var ints_rounded = numeric.round(ints);
                                var hasFloat = false; // may want to separate these later?
                                var intOutOfBounds = false;
                                for (var vali=0; vali<ints.length; vali++) {
                                    if (ints[vali] != ints_rounded[vali] && !hasFloat) {hasFloat = true;} // ints[vali] is not an integer
                                    if ((ints_rounded[vali] < -4095 || ints_rounded[vali] > 4095) && !intOutOfBounds) {intOutOfBounds = true;} // ints[vali] is outside the valid range
                                }
                                if (intOutOfBounds || hasFloat) {
                                    waveform.intFormatError.valid = false;
                                    $scope.inputsValid = false;
                                    experiment.wellsUsed = experiment.wellsUsed * 0;
                                }
                                else {
                                   waveform.intFormatError.valid = true;
                                   experiment.wellsUsed = experiment.wellsUsed * ints.length;
                              }
                            }
                            else { // length of ints is > num wells (too large)
                                waveform.intCSVLengthError.valid = false;
                                waveform.intCSVLengthError.text = 'Must have fewer intensities than total wells.\nCurrently have '+ints.length+'/'+totalWellNum+'.';
                                waveform.intFormatError.valid = true; // default
                                $scope.inputsValid = false;
                                experiment.wellsUsed = experiment.wellsUsed * 0;
                            }
                        }
                        catch (err) { // if it can't be parsed, mark CSV as invlid and all other errors as valid (cannot be tested; valid by default)
                            waveform.intsCSVFormatError.valid = false;
                            waveform.intCSVLengthError.valid = true;
                            waveform.intFormatError.valid = true;
                            $scope.inputsValid = false;
                            experiment.wellsUsed = experiment.wellsUsed * 0;
                        }
                        // Move on to the offset parameter
                        var offset;
                        try {
                            offset = parseInt(waveform.offset);
                            if (isNaN(offset) || offset < 0 || offset > 4095) {
                                waveform.offsetFormatError.valid = false;
                                $scope.inputsValid = false;
                            }
                            else {waveform.offsetFormatError.valid = true;}
                        }
                        catch (err) { // offset cannot be parsed
                            waveform.offsetFormatError.valid = false;
                            waveform.stepTimeFormatError.valid = true;
                            waveform.intOffsetSumError.valid = true;
                            $scope.inputsValid = false;
                        }
                        // Step time:
                        var stepTime;
                        try {
                            stepTime = parseFloat(waveform.stepTime);
                            if (isNaN(stepTime)) {
                                waveform.stepTimeFormatError.valid = false;
                                $scope.inputsValid = false;
                            }
                            else if (stepTime < 0 || stepTime > formData.getData().param.time) {
                                waveform.stepTimeFormatError.valid = false;
                                $scope.inputsValid = false;
                            }
                            else {waveform.stepTimeFormatError.valid = true;}
                        }
                        catch (err) { // stepTime cannot be parsed
                            waveform.stepTimeFormatError.valid = false;
                            waveform.intOffsetSumError.valid = true;
                            $scope.inputsValid = false;
                        }
                        // Now check sum of each amplitude int with offset is in the range [0,4095]
                        try {
                            if (ints !== 'undefined' && offset !== 'undefined' && !(isNaN(offset))) {
                                for (var vali=0; vali<ints.length; vali++) {
                                    if (ints[vali] + offset < 0 || ints[vali] + offset > 4095) {
                                        waveform.intOffsetSumError.valid = false;
                                        $scope.inputsValid = false;
                                        break;
                                    }
                                }
                            }
                            else {waveform.intOffsetSumError.valid = true;}
                        }
                        catch (err) {waveform.intOffsetSumError.valid = true;}
                        break;
                    case 'sine':
                        experiment.isSteadyState = false;
                        //Check that offset is [1,4095] and an integer
                        waveform.amplitudeFormatError = {};
                        waveform.amplitudeFormatError.valid = true;
                        waveform.amplitudeFormatError.text = 'Must be a positive, non-zero integer in the range  [1,4095].';
                        waveform.periodFormatError = {};
                        waveform.periodFormatError.valid = true;
                        waveform.periodFormatError.text = 'Must be a positive number.';
                        waveform.phaseFormatError = {};
                        waveform.phaseFormatError.valid = true;
                        waveform.phaseFormatError.text = 'Must be a number.';
                        waveform.offsetFormatError = {};
                        waveform.offsetFormatError.valid = true;
                        waveform.offsetFormatError.text = 'Must be a positive integer in the range [0,4095].';
                        waveform.ampOffsetSumError = {};
                        waveform.ampOffsetSumError.valid = true;
                        waveform.ampOffsetSumError.text = 'Sum of amplitude and offset must be in the range [0,4095].';
                        waveform.offsetFormatError.valid = (waveform.offset>=1 && waveform.offset <=4095 && waveform.offset%1 === 0)
                        var amp;
                        try {
                            amp = parseInt(waveform.amplitude);
                            if (isNaN(amp) || amp < 1 || amp > 4095) {
                                waveform.amplitudeFormatError.valid = false;
                                $scope.inputsValid = false;
                            }
                            else {waveform.amplitudeFormatError.valid = true;}
                        }
                        catch (err) {
                            waveform.amplitudeFormatError.valid = false;
                            $scope.inputsValid = false;
                        }
                        var period;
                        try {
                            period = parseFloat(waveform.period);
                            if (isNaN(period) || period <= 0) {
                                waveform.periodFormatError.valid = false;
                                $scope.inputsValid = false;
                            }
                            else {waveform.periodFormatError.valid = true;}
                        }
                        catch (err) {
                            waveform.periodFormatError.valid = false;
                            $scope.inputsValid = false;
                        }
                        var phase;
                        try {
                            phase = parseFloat(waveform.phase);
                            if (isNaN(phase)) {
                                waveform.phaseFormatError.valid = false;
                                $scope.inputsValid = false;
                            }
                            else {waveform.phaseFormatError.valid = true;}
                        }
                        catch (err) {
                            waveform.phaseFormatError.valid = false;
                            $scope.inputsValid = false;
                        }
                        var offset;
                        try {
                            offset = parseInt(waveform.offset);
                            if (isNaN(offset) || offset < 0 || offset > 4095) {
                                waveform.offsetFormatError.valid = false;
                                $scope.inputsValid = false;
                            }
                            else {waveform.offsetFormatError.valid = true;}
                        }
                        catch (err) {
                            waveform.offsetFormatError.valid = false;
                            $scope.inputsValid = false;
                        }
                        if (isNaN(offset + amp) || offset - amp < 0 || offset + amp > 4095) {
                            waveform.ampOffsetSumError.valid = false;
                            $scope.inputsValid = false;
                        }
                        else {waveform.ampOffsetSumError.valid = true;}
                        break;
                    case 'arb':
                        experiment.isSteadyState = false;
                        break;
                }
            }
            totalWellsUsed = totalWellsUsed + experiment.wellsUsed; // Add to the total number of wells used
        }
        if ($scope.inputsValid && totalWellsUsed > totalWellNum) { // If everything is correct (lvl 1, 2 validation), check this
          $scope.inputsValid = false;
          formData.getData().InsufficientWellsError.valid = false;
        }

        // Select which tooltip is displayed for each input field
        if(!formData.getData().timeFormatError.valid) {formData.getParam().timeTooltipErrorText = formData.getData().timeFormatError.text;}
        else {formData.getParam().timeTooltipErrorText = '';}

        // Iterate through experiments
        for(var i=0; i<formData.getData().experiments.length; i++) {
            var experiment  = formData.getData().experiments[i];
            // Check that replicates is parse-able and valid
            if (!experiment.replciatesFormatError.valid) {experiment.replicatesTooltipErrorText = experiment.replciatesFormatError.text;}
            else {experiment.replicatesTooltipErrorText = '';}
            if (!formData.getData().InsufficientWellsError.valid) { // Inputs valid, except too many wells specified. Highlight all related inputs.
               experiment.replicatesTooltipErrorText = formData.getData().InsufficientWellsError.text;
            }
            // Check Timepoints
            if (experiment.timepointsValid) { // All TP fields valid; this is ambiguous
               experiment.timepointsTooltipErrorText = experiment.allTimepointsValidError.text;
               experiment.delayTooltipErrorText = experiment.allTimepointsValidError.text;
               experiment.timepointsCSVTooltipErrorText = experiment.allTimepointsValidError.text;
            }
            else if (!experiment.redundantESTPError.valid) {
               experiment.timepointsTooltipErrorText = experiment.redundantESTPError.text;
               experiment.delayTooltipErrorText = '';
               experiment.timepointsCSVTooltipErrorText = '';
            }
            else if (!experiment.redundantDelayError.valid) {
               experiment.timepointsTooltipErrorText = '';
               experiment.delayTooltipErrorText = experiment.redundantDelayError.text;
               experiment.timepointsCSVTooltipErrorText = '';
            }
            else if (!experiment.redundantCSVError.valid) { // Equally-Spaced Time Points valid, but CSV invalid
               experiment.timepointsTooltipErrorText = '';
               experiment.delayTooltipErrorText = '';
               experiment.timepointsCSVTooltipErrorText = experiment.redundantCSVError.text;
            }
            else if (!experiment.TPCSVvalid && !experiment.ESTPvalid) {
               // Check that # Timepoints is parse-able and valid
               if (!experiment.numTimepointsFormatError.valid) {experiment.timepointsTooltipErrorText = experiment.numTimepointsFormatError.text;}
               else {experiment.timepointsTooltipErrorText = '';}
               // Check that the delay is parse-able and valid
               if (!experiment.delayFormatError.valid) {experiment.delayTooltipErrorText = experiment.delayFormatError.text;}
               else {experiment.delayTooltipErrorText = '';}
               // Check timepoints CSV
               // CSV cannot be parsed; don't care about other errors
               if (!experiment.timepointsCSVFormatError.valid) {experiment.timepointsCSVTooltipErrorText = experiment.timepointsCSVFormatError.text;}
               // Check intensity values
               else if (!experiment.timepointFormatError.valid) {experiment.timepointsCSVTooltipErrorText = experiment.timepointFormatError.text;}
               // Check intensity length
               else if (!experiment.timepointsCSVLengthError.valid) {experiment.timepointsCSVTooltipErrorText = experiment.timepointsCSVLengthError.text;}
               else {experiment.timepointsCSVTooltipErrorText = '';}
            }
            else {
               // Check total number of wells used
               if (experiment.TPCSVvalid && !formData.getData().InsufficientWellsError.valid) { // Highlight CSV for invalid # of timepoints
                    experiment.timepointsCSVTooltipErrorText = formData.getData().InsufficientWellsError.text;
               }
               else if (!formData.getData().InsufficientWellsError.valid) { // Highlight ESP inputs field for invalid # of timepoints
                    experiment.timepointsTooltipErrorText = formData.getData().InsufficientWellsError.text;
               }
               else { // No issue with lvl 3 validation (# timepoints accross experiments)
                    experiment.timepointsTooltipErrorText = '';
                    experiment.delayTooltipErrorText = '';
                    experiment.timepointsCSVTooltipErrorText = '';
               }
            }

            // Check each waveform
            for(var j = 0; j < experiment.waveforms.length; j++) {
                var waveform = experiment.waveforms[j];
                // Check if an LED has been selected by more than one waveform
                if (!waveform.LEDSelectionError.valid) {waveform.LEDSelectionTooltipErrorText = waveform.LEDSelectionError.text;}
                else {waveform.LEDSelectionTooltipErrorText = '';}
                switch(waveform.type) {
                    case 'const':
                        // CSV cannot be parsed; don't care about other errors
                        if (!waveform.intsCSVFormatError.valid) {waveform.intsCSVTooltipErrorText = waveform.intsCSVFormatError.text;}
                        // Check intensity values
                        else if (!waveform.intFormatError.valid) {waveform.intsCSVTooltipErrorText = waveform.intFormatError.text;}
                        // Check intensity length
                        else if (!waveform.intCSVLengthError.valid) {waveform.intsCSVTooltipErrorText = waveform.intCSVLengthError.text;}
                        else if (!experiment.addWaveformsLengthError.valid) {waveform.intsCSVTooltipErrorText = experiment.addWaveformsLengthError.text;}
                        else if (!formData.getData().InsufficientWellsError.valid) {waveform.intsCSVTooltipErrorText = formData.getData().InsufficientWellsError.text;}
                        else {waveform.intsCSVTooltipErrorText = '';}
                        break;
                    case 'step':
                        // Check for parsing errors in ints:
                        if (!waveform.intsCSVFormatError.valid) {waveform.intsCSVTooltipErrorText = waveform.intsCSVFormatError.text;}
                        // Check intensity values
                        else if (!waveform.intFormatError.valid) {waveform.intsCSVTooltipErrorText = waveform.intFormatError.text;}
                        // Check intensity length
                        else if (!waveform.intCSVLengthError.valid) {waveform.intsCSVTooltipErrorText = waveform.intCSVLengthError.text;}
                        // Check for sum errors
                        else if (!waveform.intOffsetSumError.valid) {waveform.intsCSVTooltipErrorText = waveform.intOffsetSumError.text;}
                        else if (!formData.getData().InsufficientWellsError.valid) {waveform.intsCSVTooltipErrorText = formData.getData().InsufficientWellsError.text;}
                        else {waveform.intsCSVTooltipErrorText = '';}
                        // Check offset
                        if (!waveform.offsetFormatError.valid) {waveform.offsetTooltipErrorText = waveform.offsetFormatError.text;}
                        else if (!waveform.intOffsetSumError.valid) {waveform.offsetTooltipErrorText = waveform.intOffsetSumError.text;}
                        else {waveform.offsetTooltipErrorText = '';}
                        // Check stepTime
                        if (!waveform.stepTimeFormatError.valid) {waveform.stepTimeTooltipErrorText = waveform.stepTimeFormatError.text;}
                        else {waveform.stepTimeTooltipErrorText = '';}
                        break;
                    case 'sine':
                        // Check formatting on each input:
                        // Amp
                        if (!waveform.amplitudeFormatError.valid) {waveform.ampTooltipErrorText = waveform.amplitudeFormatError.text;}
                        else {waveform.ampTooltipErrorText = '';}
                        // Period
                        if (!waveform.periodFormatError.valid) {waveform.periodTooltipErrorText = waveform.periodFormatError.text;}
                        else {waveform.periodTooltipErrorText = '';}
                        // Phase
                        if (!waveform.phaseFormatError.valid) {waveform.phaseTooltipErrorText = waveform.phaseFormatError.text;}
                        else {waveform.phaseTooltipErrorText = '';}
                        // Offset
                        if (!waveform.offsetFormatError.valid) {waveform.offsetTooltipErrorText = waveform.offsetFormatError.text;}
                        else {waveform.offsetTooltipErrorText = '';}
                        // Now, check the sum error if both inputs are valid
                        if (waveform.amplitudeFormatError.valid && waveform.offsetFormatError.valid && !waveform.ampOffsetSumError.valid) {
                            waveform.ampTooltipErrorText = waveform.ampOffsetSumError.text;
                            waveform.offsetTooltipErrorText = waveform.ampOffsetSumError.text;
                        }
                        break;
                    //case 'arb':

                        //break;
                }
            }
        }
        formData.setValid($scope.inputsValid);
    }
}]);