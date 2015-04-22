var app = angular.module('myApp', []);
app.controller('personCtrl', function($scope) {
    $scope.leds=[];
    //Utility function to repeat X number of times
    $scope.getNumber = function(num) {
        return new Array(num);   
    }
    $scope.$watch('leds', function (value) {
        console.log(value);
    }, true);
});