//Grab module
var app = angular.module('LPI', ['ngHandsontable', '720kb.tooltips']);
app.config(function(tooltipsConfigProvider) {
     tooltipsConfigProvider.options({
         lazy: true,
         side: 'right'
     })
 });
//Controller for the form
app.controller('formController',['$scope', '$timeout','formData','plate','formValidation', function($scope,$timeout,formData,plate,formValidation) {
    // =================================================================================================================
    // Hooks for HTML

    //Holds the current display state of the form
    $scope.display={};

    $scope.formData = formData;

    $scope.inputStyle = formData.getData().inputStyle;

    //Fetches the device from the Data service
    $scope.device = formData.getData().device;
    // Initialize the row/col fill select
    if (formData.getData().param.rcOrientation === undefined) {
          formData.getData().param.rcOrientation = "1";
    }

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
        //If in simple dynamic mode
        if(formData.getData().inputStyle===1) {
            newExperiment.sample = 1;
            newExperiment.startTime = "0";
            newExperiment.replicates = 24;
        }
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
                newExperiment.pairing = oldExperiment.pairing;
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
                    if(newWaveform.type === "arb") {
                        //I have to individually change the rows to preserve the reference to arbData since this is what
                        //the handson table points to
                        for (var k = 0; k < oldWaveform.arbData.length; k++) {
                            newWaveform.arbData[k] = oldWaveform.arbData[k];
                        }
                    }
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
    $scope.$watch('formData.getUserInput()', function() {
        formValidation.update();
        if (formData.isValid()) {
            try {
                plate.set(new Plate(formData.getData()));
            }
            catch(err) {
                console.log("Caught plate creation error");
                console.log(err);
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
            $scope.display.stateVariables = 'none';
        }
        else {
            $scope.display.runVariables = 'block';
            $scope.display.stateVariables = 'block';
        }
        //Check if device is selected and if an experiment is added, then toggle on the download button
        if($scope.device!==undefined && $scope.device.name!="default" && formData.getData().experiments.length>0 && formData.isValid()){
            $scope.display.download = 'block';
        }
        else {
            $scope.display.download = 'none';
        }
    }

    // Initizlize display params
    if (formData.getData().inputStyle == 0) {
        $scope.display.newExperiment = 'none';
    }
    else if (formData.getData().inputStyle == 1) {
        $scope.display.newExperiment = 'none';
    }
    else {
        $scope.display.newExperiment = 'block';
    }

    // Update functions for input style buttons
    $scope.switchToSteady = function(){
        if ($scope.inputStyle != 0 && confirm("Do you want to switch to the Steady State input style? All entered data will be lost.")) {
            console.log("Switching to steady input style.");
            formData.reset();
            formData.getData().inputStyle = 0;
            $scope.inputStyle = 0;
            formData.getParam().rcOrientation = 1; // fill by rows
            formData.getParam().time = 1; // Steady-state + don't turn off LEDs at end => short duration, small program
        }
    };

    $scope.switchToSimple = function(){
        if ($scope.inputStyle != 1 && confirm("Do you want to switch to the Simple Dynamic input style? All entered data will be lost.")) {
            console.log("Switching to simple input style.");
            //console.log("Device: " + JSON.stringify($scope.device));
            formData.reset();
            formData.getData().inputStyle = 1;
            $scope.inputStyle = 1;
            formData.getParam().time = null;
            formData.getParam().rcOrientation = 1; // fill by rows
            $scope.addExperiment();
        }
    };

    $scope.switchToAdvanced = function(){
        if ($scope.inputStyle != 2 && confirm("Do you want to switch to the Advanced Dynamic input style? All entered data will be lost.")) {
            console.log("Switching to advnaced input style.");
            formData.reset();
            formData.getParam().time = null;
            formData.getData().inputStyle = 2;
            $scope.inputStyle = 2;
            formData.getParam().rcOrientation = 1; // fill by rows
        }
    };

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
        this.pairing = "combine";
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
    formValidation.update();

}]);