var app = angular.module('myApp', []);
app.controller('ctrl', function($scope) {
    $scope.leds=[];
    $scope.devices=[
        {
            name:'Two Color Array',
            rows: 8,
            cols: 12,
            leds: [630, 660],
            display: 'none'
        },{
            name:'Light Plate Apparatus',
            rows: 4,
            cols: 6,
            leds: [630, 660],
            display: 'none'
        },
        {
            name:'Light Tube Array',
            rows: 8,
            cols: 8,
            leds: [630, 660],
            display: 'none'
        },
        {
            name:'OptoGeneSat',
            rows: 4,
            cols: 12,
            leds: [630, 660],
            display: 'none'
        },
        {
            name:'Custom Configuration',
            rows: 4,
            cols: 6,
            leds: [],
            display: 'block'
        }
    ];

    //Utility function to repeat X number of times
    $scope.getNumber = function(num) {
        return new Array(num);
    };
    $scope.$watch('device.leds', function (value) {
        console.log(value);
    }, true);
    $scope.$watch('test', function (value) {
        console.log(value);
    }, true);
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
//Load up all the templates
app.run(function($templateCache,$http){
    $http.get('const.html', {cache:$templateCache});
    $http.get('step.html', {cache:$templateCache});
    $http.get('sine.html', {cache:$templateCache});
    $http.get('arb.html', {cache:$templateCache});
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


    /*function(){
    return {
        restrict: 'A',
        scope: {
            waveform: '=myWaveform'
        },
        templateUrl: '{{waveform.file}}',
        transclude: false
    };
});*/
    /*

    'myWaveform', function($http, $templateCache, $compile, $parse) {
    return {
        link: function(scope , iElement, iAttrs) {
            $http.get(scope.waveform.file, {cache: $templateCache}).success(function(tplContent){
                iElement.replaceWith($compile(tplContent)(scope));
            });
        }
    }
});*/


/*

    'myWaveform', function(){
    return {
        restrict: 'A',
        scope: {
            waveform: '=myWaveform'
        },
        templateUrl: 'const.html',
        transclude: false
    };
});*/