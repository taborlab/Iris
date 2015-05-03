//Grab module
var app = angular.module('LPI', []);
//Controller for the form
app.controller('formController',['$scope', '$timeout','formData','plate', function($scope,$timeout,formData,plate) {
    $scope.leds=[];
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
    });
    $scope.cssRefresh=false;
    //Fetches the device from the Data service
    $scope.device = formData.getData().device;
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
        $scope.getExperiments().push(new Experiment($scope.deleteExperiment, $scope.getWellDomain));
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
            console.log("Caught plate creation error");
        }
    }
    $scope.$watch('device', $scope.reloadPlate, true);
    $scope.$watch('param', $scope.reloadPlate, true);
    $scope.$watch('getExperiments()', $scope.reloadPlate, true);
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
            this.waveforms.push(new Waveform(waveformType,this.waveforms));
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
            $scope.$apply(function() {
                //Get the data and parse it to an object
                var newData = JSON.parse(e.target.result)
                //Change the name of the loaded device
                newData.device.name = "Uploaded: " + newData.device.name;
                //Add the loaded device to the device menu
                $scope.devices.push(newData.device);
                //Load all of the form data
                formData.setData(newData);
                //Set the active device to the loaded device
                $scope.device = formData.getData().device;
            });
        };
        reader.readAsText(file);
    };
}]);