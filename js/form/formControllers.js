//Grab module
var app = angular.module('LPI', ['ngHandsontable', '720kb.tooltips']);
//Controller for the form
app.controller('formController',['$scope', '$timeout','formData','plate', function($scope,$timeout,formData,plate) {
    $scope.leds=[];
    $scope.display={};
    $scope.getColors = function() {return formData.getColors()};
    $scope.getDevice = function() {return formData.getData().device};
    //Fetches the device from the Data service
    $scope.device = formData.getData().device;
    $scope.cssRefresh=false;
    $scope.getData = formData.getData;
    $scope.updateDisplay = function() {
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
        if($scope.device!==undefined && $scope.device.name!="default" && $scope.getData().experiments.length>0 && $scope.inputsValid){
            $scope.display.download = 'block';
        }
        else {
            $scope.display.download = 'none';
        }
    }

    $scope.updateDisplay();
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
        $scope.updateDisplay()
    });
    //Fetches the param from the Data service
    $scope.getParam = function(){return formData.getParam()};
    $scope.updateDevice = function(value){formData.setDevice(value);};
    //Run when the simulation button is clicked
    $scope.simulated = false;
    $scope.runSimulation = function(){
        $scope.simulated=true;
       plate.set(new Plate(formData.getData()));
    };
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
    $scope.toConsole = function(object){
        console.log(object);
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
            var currExpWellCount = $scope. getExperiments()[i].getWellCount();
            if ($scope.getExperiments()[i] == experiment) {
                return {'low': wells + 1, 'high':wells+currExpWellCount};
            }
            else {
                wells = wells + currExpWellCount;
            }
        }
        return currExpWellCount;
    };
    //Live updating of plate
    $scope.reloadPlate = function() {
        try {
            plate.set(new Plate(formData.getData()));
        }
        catch(err) {
            console.log(err);
            console.log("Caught plate creation error");
        }
    }
    //Called when any data is changed
    $scope.$watch('getData()', function() {
        updateValidation();
        if ($scope.inputsValid) {
            $scope.reloadPlate();
        }
        $scope.updateDisplay();
    }, true);
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
            var wells = replicates * samples;
            for (var i=0; i<this.waveforms.length; i++) {
                wells = wells * this.waveforms[i].countWaveforms();
            }
            return wells;
        };
    }
    //Downloads the plate
    $scope.downloadPlate = function(){
        plate.get().createLPF();
    };
    //Gets a new random seed for the random number generator
    $scope.newSeed = function(){
        $scope.getParam().seed=Math.random().toString();
    }

    //Handles uploading the savefiles
    $scope.file_changed = function(element) {
        var file  = element.files[0];
        var reader = new FileReader();
        reader.onload = function(e) {
            //Get the data and parse it to an object
            var newData = JSON.parse(e.target.result)
            $scope.$apply(function() {
                //Change the name of the loaded device
                newData.device.name = "Uploaded: " + newData.device.name;
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
                    for (var j = 0; j < oldExperiment.waveforms.length; j++) {
                        var oldWaveform = oldExperiment.waveforms[j];
                        var newWaveform = newExperiment.addWaveform(oldWaveform.type);
                        //Set all the variables, if they are undefined in the save, this won't do anything
                        newWaveform.wavelengthIndex = oldWaveform.wavelengthIndex;
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
            //Sets data a second time, this is a hacky way
            //to get by the fact that the wavelength dropdown ng-init
            //overwrites the wavelength index when the html is inserted
            $scope.$apply();
        };
        reader.readAsText(file);
    };

    //Resets the file when the file upload button is clicked
    //This allows you to reupload the same file repeatedly and still trigger the onChange event
    $scope.file_clicked = function(element) {
        element.value=null;
    }

    // Validation Function
    // Loops through form hierarchy and creates error objects containing:
    //      1. boolean -- whether the particular error has occurred
    //      2. str -- text describing the nature of the error (which will be applied to the tooltip)
    $scope.inputsValid = true;
    function updateValidation() {
        $scope.inputsValid = true;
        // First, iterate through all data elements and determine which errors are present.
        //  Set their .valid elements to false
        var totalWellNum = $scope.device.rows * $scope.device.cols;
        for(var i=0; i<formData.getData().experiments.length; i++) {
            var experiment  = formData.getData().experiments[i];
            for(var j = 0; j < experiment.waveforms.length; j++) {
                var waveform = experiment.waveforms[j];
                switch (waveform.type) { // check each waveform
                    case 'const':
                        // Define all possible errors for this waveform:
                        waveform.intsCSVFormatError = {};
                        waveform.intsCSVFormatError.text = 'Must be a comma separated list of valid integers.';
                        waveform.intCSVLengthError = {};
                        waveform.intCSVLengthError.text = 'Must have at least one intensity.';
                        waveform.intFormatError = {};
                        waveform.intFormatError.text = 'Intensities must be integer values in the range [0,4095].';
                        var ints; // will hold intensity CSV list
                        // try parsing the intensity CSV
                        try {ints = JSON.parse('['+waveform.ints+']');}
                        catch (err) { // if it can't be parsed, mark CSV as invlid and all other errors as valid (cannot be tested; valid by default)
                            waveform.intsCSVFormatError.valid = false;
                            waveform.intCSVLengthError.valid = true;
                            waveform.intFormatError.valid = true;
                            $scope.inputsValid = false;
                            break;
                        }
                        if (ints !== undefined) { // Ints list was parsed successfully, check other aspects of the inputs
                            waveform.intsCSVFormatError.valid = true;
                            if (ints.length == 0) {
                                waveform.intCSVLengthError.valid = false; // default error text
                                waveform.intFormatError.valid = true; // default
                                $scope.inputsValid = false;
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
                                }
                                else {waveform.intFormatError.valid = true;}
                            }
                            else { // length of ints is > num wells (too large)
                                waveform.intCSVLengthError.valid = false;
                                waveform.intCSVLengthError.text = 'Must have fewer intensities than total wells.\nCurrently have '+ints.length+'/'+totalWellNum+'.';
                                waveform.intFormatError.valid = true; // default
                                $scope.inputsValid = false;
                            }
                        }
                        else {
                            waveform.intsCSVFormatError.valid = true;
                            waveform.intCSVLengthError.valid = false;
                            waveform.intFormatError.valid = true;
                            $scope.inputsValid = false;
                        }
                        break;
                    case 'step':
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
                                }
                                else {waveform.intFormatError.valid = true;}
                            }
                            else { // length of ints is > num wells (too large)
                                waveform.intCSVLengthError.valid = false;
                                waveform.intCSVLengthError.text = 'Must have fewer intensities than total wells.\nCurrently have '+ints.length+'/'+totalWellNum+'.';
                                waveform.intFormatError.valid = true; // default
                                $scope.inputsValid = false;
                            }
                        }
                        catch (err) { // if it can't be parsed, mark CSV as invlid and all other errors as valid (cannot be tested; valid by default)
                            waveform.intsCSVFormatError.valid = false;
                            waveform.intCSVLengthError.valid = true;
                            waveform.intFormatError.valid = true;
                            $scope.inputsValid = false;
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
                        //Check that offset is [1,4095] and an integer
                        waveform.offsetFormatError = {};
                        waveform.offsetFormatError.valid = (waveform.offset>=1 && waveform.offset <=4095 && waveform.offset%1 === 0)
                        if ($scope.inputsValid) {$scope.inputsValid = waveform.offsetFormatError.valid;} // set global variable
                        waveform.offsetFormatError.text = 'Wrong Format!';
                        break;
                    //case 'arb':

                        //break;
                }
            }
        }
        for(var i=0; i<formData.getData().experiments.length; i++) {
            var experiment  = formData.getData().experiments[i];
            for(var j = 0; j < experiment.waveforms.length; j++) {
                var waveform = experiment.waveforms[j];
                switch(waveform.type) {
                    case 'const':
                        // CSV cannot be parsed; don't care about other errors
                        if (!waveform.intsCSVFormatError.valid) {waveform.intsCSVTooltipErrorText = waveform.intsCSVFormatError.text;}
                        // Check intensity values
                        else if (!waveform.intFormatError.valid) {waveform.intsCSVTooltipErrorText = waveform.intFormatError.text;}
                        // Check intensity length
                        else if (!waveform.intCSVLengthError.valid) {waveform.intsCSVTooltipErrorText = waveform.intCSVLengthError.text;}
                        else {waveform.intsCSVTooltopErrorText = '';}
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
                        //Check that offset is [1,4095] and an integer
                        if(waveform.offsetFormatError.valid){waveform.offsetTooltipErrorText = '';}
                        else {waveform.offsetTooltipErrorText = waveform.offsetFormatError.text;}
                }
            }
        }
        formData.setValid($scope.inputsValid);
    }
}]);