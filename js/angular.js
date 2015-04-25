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
    }
    $scope.$watch('device.leds', function (value) {
        console.log(value);
    }, true);
    $scope.$watch('test', function (value) {
        console.log(value);
    }, true);
});