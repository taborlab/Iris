//Grab module
var app = angular.module('LPI', []);
//Controller for the form
app.controller('formController', function($scope,$timeout) {
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
    //Default device
    $scope.device = null;
    //Run when the simulation button is clicked
    $scope.simulated = false;
    $scope.runSimulation = function(){
        $scope.simulated=true;
        //$scope.plate = new Plate({'device': $scope.device},{'param':{}},{'experiments':$scope.experiments});
    }
    $scope.experiments=[];
    $scope.deleteExperiment = function(experiment){
        var index = $scope.experiments.indexOf(experiment);
        if(index>-1) {
            $scope.experiments.splice(index, 1);
        }
    }
    $scope.addExperiment = function(){
        $scope.experiments.push(new Experiment($scope.deleteExperiment));
    };
    $scope.toConsole = function(object){
        console.log(object);
    }
    //Utility function to repeat X number of times,
    $scope.getNumber = function(num) {
        return new Array(num);
    };
});
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
}
//An experiment object
function Experiment(deleteExperiment) {
    this.waveforms = [];
    this.deleteExperiment = function (){deleteExperiment(this)};
    this.addWaveform = function(waveformType){
        this.waveforms.push(new Waveform(waveformType,this.waveforms));
    };
}