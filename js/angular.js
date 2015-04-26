var app = angular.module('myApp', []);
//Load up all the templates
app.run(function($templateCache,$http){
    $http.get('const.html', {cache:$templateCache});
    $http.get('step.html', {cache:$templateCache});
    $http.get('sine.html', {cache:$templateCache});
    $http.get('arb.html', {cache:$templateCache});
});
app.controller('ctrl', function($scope) {
    $scope.leds=[];
    //Loads devices from file
    $.getJSON("devices.json", function(json) {
        console.log(json); // this will show the info it in firebug console
        $scope.devices = json;
    });

    //Utility function to repeat X number of times
    $scope.getNumber = function(num) {
        return new Array(num);
    };
});
function Waveform(waveformType,waveforms){
    this.file = waveformType+'.html';
    this.deleteWaveform = function (){
        var index = waveforms.indexOf(this);
        if(index>-1) {
            waveforms.splice(index, 1);
        }
    };
}
function Experiment(deleteExperiment) {
    this.waveforms = [];
    this.deleteExperiment = function (){deleteExperiment(this)};
    this.addWaveform = function(waveformType){
        this.waveforms.push(new Waveform(waveformType,this.waveforms));
    };
}
app.controller('runCtrl',['$scope',function($scope){
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
}]);
app.directive('myExperiment', function(){
    return {
        restrict: 'A',
        templateUrl: 'experiment.html',
        transclude: false,
        scope: {
            experiment: '=myExperiment'
        }
    };
});
app.directive('myWaveform',['$compile', '$templateCache', function ($compile, $templateCache) {

    var getTemplate = function(file) {
        console.log($templateCache.get(file));
        var template = $templateCache.get(file)[1];
        return template;
    }

    return {
        scope: {
            waveform: '=myWaveform'},
        restrict: 'A',
        link: function(scope, element) {
            var template = $templateCache.get(scope.waveform.file)[1];
            element.html(template);
            $compile(element.contents())(scope);
        }
    };
}]);