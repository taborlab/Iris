//Grab module
var app = angular.module('LPI', ['ngHandsontable', '720kb.tooltips']);
app.config(function(tooltipsConfigProvider) {
     tooltipsConfigProvider.options({
         lazy: true,
         side: 'right'
     })
 });
//Controller for the form
app.controller('formController',['$scope', '$timeout','formData','plate','formValidation','arbTableListener','SSTableListener', function($scope,$timeout,formData,plate,formValidation,arbTableListener,SSTableListener) {
    // =================================================================================================================
    // Hooks for HTML

    //Holds the current display state of the form
    $scope.display={};

    $scope.formData = formData;

    $scope.getInputStyle = function(){return formData.getData().inputStyle;};

    //Fetches the device from the Data service
    $scope.getDevice = function(){return formData.getData().device;};
    //Deprecated, can be eliminated when the about function is used to replace any calls to it
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
        var newExperiment = new Experiment($scope.deleteExperiment);
        //If in simple dynamic mode
        if(formData.getData().inputStyle===1) {
            newExperiment.samples = 1;
            newExperiment.startTime = "0";
            newExperiment.replicates = 24;
        }
        $scope.getExperiments().push(newExperiment);
        return newExperiment;
    };

    //Gets a new random seed for the random number generator, used when randomize is checked
    $scope.newSeed = function(){
        formData.getParam().seed=Math.random().toString();
    };

    //Downloads the plate
    $scope.downloadPlate = function(){
        plate.get().createLPF(formData.getUserInput(true));
    };

    //Handles uploading the savefiles
    $scope.file_changed = function(element) {
        var file  = element.files[0];
        var reader = new FileReader();
        reader.onload = function(e) {
            //Get the data and parse it to an object
            var oldData = JSON.parse(e.target.result);

            //Change the name of the loaded device
            oldData.device.uploaded = true;
            //Add the loaded device to the device menu
            $scope.devices.push(oldData.device);
            //Set device and parameters
            formData.setDevice(oldData.device);
            if(typeof oldData.device.deselected === 'undefined') {
                oldData.device.deselected = [];
            }
            formData.setParam(oldData.param);
            if(typeof formData.getParam().rcOrientation === 'undefined') {
                formData.getParam().rcOrientation = 1;
            }
            if(typeof oldData.inputStyle !== 'undefined') {
                formData.getData().inputStyle = oldData.inputStyle;
            }
            else {
                formData.getData().inputStyle = 2;
            }
            formData.getData().experiments=[];
            for (var i = 0; i < oldData.experiments.length; i++) {
                var oldExperiment = oldData.experiments[i];
                var newExperiment = $scope.addExperiment();
                newExperiment.replicates = oldExperiment.replicates;
                newExperiment.samples = oldExperiment.samples;
                newExperiment.startTime = oldExperiment.startTime;
                newExperiment.timepoints = oldExperiment.timepoints;
                if(typeof oldExperiment.pairing !== 'undefined') {
                    newExperiment.pairing = oldExperiment.pairing;
                }
                else {
                    newExperiment.pairing = "combine";
                }
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
            if(typeof oldData.steadyStateData !== 'undefined') {
                formData.getSteadyTable().loadData(oldData.steadyStateData);
            }
            else {
                formData.getSteadyTable().loadData([[]]);
            }
            //Set the active device to the loaded device
            $scope.device = formData.getData().device;
            $scope.$apply();

            $scope.$apply(updateSS());
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
        $scope.devicesLoaded=true;
        updateDisplay()
    });

    //Called when any data is changed
    $scope.getData = formData.getData;
    $scope.$watch('formData.getUserInput()', updateForm, true);

    function updateForm() {
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
        else {
            plate.set(null);
        }
        updateDisplay();
    }
    arbTableListener.register(function() {$scope.$apply(updateForm);});

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
        if($scope.getDevice()===undefined || $scope.getDevice().name=="default") {
            $scope.display.runVariables = 'none';
            $scope.display.stateVariables = 'none';
        }
        else {
            $scope.display.runVariables = 'block';
            $scope.display.stateVariables = 'block';
        }
        //Check if device is selected and if an experiment is added, then toggle on the download button
        if($scope.getDevice()!==undefined && $scope.getDevice().name!="default" && formData.getData().experiments.length>0 && formData.isValid()){
            $scope.display.download = 'block';
        }
        else {
            $scope.display.download = 'none';
        }
    }

    function getLEDNames() {
        var leds = formData.getData().device.leds;
        var ledNames = []

        for(var i=0; i< leds.length; i++) {
            if(typeof leds[i] === 'undefined') {
                ledNames[i] = '';
            }
            else {
                ledNames[i] = leds[i].wavelength;
            }
        }

        return ledNames;
    }

    //Updates the SteadyState input table to reflect the properties of the current device
    function updateSS() {
        if(typeof formData.getSteadyTable() === 'undefined') {
            return;
        }

        var device = formData.getData().device;
        var steadyTable = formData.getSteadyTable();

        var rowNum = device.rows*device.cols;
        var rowHeaders = [];
        var rowKey = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for(var i = 0; i<device.rows; i++) {
            for(var j = 0; j<device.cols; j++){
                rowHeaders.push(rowKey[i]+j);
            }
        }

        var colNum = device.leds.length;
        var colHeaders = getLEDNames();

        //Update ssData object backing table
        var newData=[];
        for(var r = 0; r<rowNum; r++) {
            newData[r] = [];
            for(var c = 0; c < colNum; c++) {
                if(typeof steadyTable.getDataAtCell(r,c) === 'undefined' || steadyTable.getDataAtCell(r,c) === null){
                    newData[r][c] = 0;
                }
                else {
                    newData[r][c] = steadyTable.getDataAtCell(r, c);
                }
            }
        }
        steadyTable.updateSettings({
            minRows: rowNum,
            maxRows: rowNum,
            rowHeaders: rowHeaders,
            minCols:colNum,
            maxCols:colNum,
            colHeaders: colHeaders
        });

        //Loads the truncated or expanded data object
        //Also is weirdly required to cause the min/max row/col adjustment to enter into effect
        steadyTable.loadData(newData);
    }

    SSTableListener.register(function(){
        if(formData.getData().inputStyle === 0 ){
                $scope.$apply(createSS);
            }
    });

    //Sets the data in formData to represent the current entry in the steady state table
    function createSS() {
        formData.reset();
        formData.getData().param.offSwitch = false;
        formData.getData().param.randomized = false;
        formData.getData().param.rcOrientation = 1;
        formData.getData().param.time = 1;
        var experiment = $scope.addExperiment();
        experiment.pairing = "add";
        experiment.samples = 1;
        experiment.startTime = "0";
        experiment.replicates = 1;

        //Creates the waveforms by converting the steady state data to multiple constant functions which add together
        var ssData = formData.getSteadyTable().getData();
        for(var c = 0; c < ssData[0].length; c++) {
            var ints = [];
            for(var r = 0; r < ssData.length; r++){
                ints.push(ssData[r][c]);
            }
            var waveform = experiment.addWaveform("const");
            waveform.ints = ints.join(", ");
            waveform.wavelengthIndex = c.toString();
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
        if (formData.getData().inputStyle != 0) { // switching to new state
            if (formData.getData().inputStyle == -1 || (formData.getData().inputStyle != -1) && confirm("Do you want to switch to the Steady State input style? All entered data will be lost.")) {
                // not switching from default and user agrees
                formData.reset();

                //Reset steady state table
                var ssData = formData.getData().steadyTable.getData();
                var newData = [];
                for(var r = 0; r < ssData.length; r++) {
                    newData[r] = [];
                    for(var c = 0; c < ssData[r].length; c++) {
                        newData[r][c] = 0;
                    }
                }
                formData.getData().steadyTable.loadData(newData);

                formData.getData().inputStyle = 0;
                formData.getParam().rcOrientation = 1; // fill by rows
                formData.getParam().time = 1; // Steady-state + don't turn off LEDs at end => short duration, small program
                updateSS();
                createSS();
            }
        }
    };

    $scope.switchToSimple = function(){
        if (formData.getData().inputStyle != 1) {
            if (formData.getData().inputStyle == -1 || (formData.getData().inputStyle != -1) && confirm("Do you want to switch to the Steady State input style? All entered data will be lost.")) {
                formData.reset();
                formData.getData().inputStyle = 1;
                formData.getParam().time = null;
                formData.getParam().rcOrientation = 1; // fill by rows
                $scope.addExperiment();
            }
        }
    };

    $scope.switchToAdvanced = function(){
        if (formData.getData().inputStyle != 2) {
            if (formData.getData().inputStyle == -1 || (formData.getData().inputStyle != -1) && confirm("Do you want to switch to the Steady State input style? All entered data will be lost.")) {
                formData.reset();
                formData.getData().inputStyle = 2;
                formData.getParam().rcOrientation = 1; // fill by rows
            }
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
    function Experiment(deleteExperiment) {
        this.pairing = "combine";
        this.waveforms = [];
        this.deleteExperiment = function (){deleteExperiment(this)};
        this.addWaveform = function(waveformType){
            var newWaveform = new Waveform(waveformType,this.waveforms);
            this.waveforms.push(newWaveform);
            return newWaveform;
        };
        // Count the number of wells required for this experiment for indicators
        this.getWellCount = function(){
            if(!formData.isValid()) {
                return "";
            }
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