//Grab module
var app = angular.module('LPI', []);
//Controller for the form
app.controller('formController',['$scope', '$timeout','formData', function($scope,$timeout,formData) {
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
        $scope.plate = new Plate({device: $scope.device,param:$scope.param,experiments:$scope.experiments});
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
        $scope.experiments.push(new Experiment($scope.deleteExperiment));
    };
    $scope.toConsole = function(object){
        console.log(object);
    };
    //Utility function to repeat X number of times,
    $scope.getNumber = function(num) {
        return new Array(num);
    };
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
}
//An experiment object
function Experiment(deleteExperiment) {
    this.waveforms = [];
    this.deleteExperiment = function (){deleteExperiment(this)};
    this.addWaveform = function(waveformType){
        this.waveforms.push(new Waveform(waveformType,this.waveforms));
    };
}