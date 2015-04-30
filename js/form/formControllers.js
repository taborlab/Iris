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
    $scope.param = formData.getData().param;
    $scope.updateDevice = function(value){formData.setDevice(value);};
    //Run when the simulation button is clicked
    $scope.simulated = false;
    $scope.runSimulation = function(){
        $scope.simulated=true;
       plate.set(new Plate(formData.getData()));
    };
    //Fetches the experiments from the Data service
    $scope.experiments=formData.getData().experiments;
    $scope.deleteExperiment = function(experiment){
        var index = $scope.experiments.indexOf(experiment);
        if(index>-1) {
            $scope.experiments.splice(index, 1);
        }
    };
    $scope.addExperiment = function(){
        $scope.experiments.push(new Experiment($scope.deleteExperiment, $scope.getWellDomain));
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
        for (var i=0; i<$scope.experiments.length; i++) {
            var currExpWellCount = $scope.experiments[i].getWellCount();
            if ($scope.experiments[i] == experiment) {
                return {'low': wells, 'high':wells+currExpWellCount-1};
            }
            else {
                wells = wells + currExpWellCount;
            }
        }
        return currExpWellCount;
    };
    //Live updating of plate
    $scope.$watchGroup(['device','param','experiments'], reloadPlate, true);
    function reloadPlate(){
        plate.set(new Plate(formData.getData()));
    }
}]);
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