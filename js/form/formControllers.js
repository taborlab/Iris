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
        var t1 = $scope.device!==undefined;
        var t2 = $scope.device.name!="default";
        var t3 = $scope.getData().experiments.length>0;
        console.log("Testing if download should show: " + t1 + " AND " + t2 + " AND " + t3 + " AND " + $scope.inputsValid);
        if($scope.device!==undefined && $scope.device.name!="default" && $scope.getData().experiments.length>0 && $scope.inputsValid){
            console.log("Showing download box.");
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
    $scope.getWellDomain = function(experiment) {
        var wells = 0;
        for (var i=0; i<$scope.getExperiments().length; i++) {
            var currExpWellCount = $scope. getExperiments()[i].getWellCount();
            if ($scope.getExperiments()[i] == experiment) {
                return {'low': wells, 'high':wells+currExpWellCount-1};
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
        console.log("Updating display...");
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
                    console.log(oldExperiment);
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
        for(var i=0; i<formData.getData().experiments.length; i++) {
            var experiment  = formData.getData().experiments[i];
            for(var j = 0; j < experiment.waveforms.length; j++) {
                var waveform = experiment.waveforms[j];
                if(waveform.type === 'sine') {
                    //Check that offset is [1,4095] and an integer
                    waveform.offsetFormatError = {};
                    waveform.offsetFormatError.valid = (waveform.offset>=1 && waveform.offset <=4095 && waveform.offset%1 === 0)
                    if ($scope.inputsValid) {$scope.inputsValid = waveform.offsetFormatError.valid;} // set global variable
                    console.log("Set inputsValid to: " + waveform.offsetFormatError.valid);
                    waveform.offsetFormatError.text = 'Wrong Format!'
                }
            }
        }
        for(var i=0; i<formData.getData().experiments.length; i++) {
            var experiment  = formData.getData().experiments[i];
            for(var j = 0; j < experiment.waveforms.length; j++) {
                var waveform = experiment.waveforms[j];
                if(waveform.type === 'sine') {
                    //Check that offset is [1,4095] and an integer
                    if(waveform.offsetFormatError.valid){
                        waveform.offsetTooltipErrorText = '';
                    }
                    else {
                        waveform.offsetTooltipErrorText = waveform.offsetFormatError.text;
                    }
                }
            }
        }
    }
}]);