//Load html templates into cache
app.run(function($templateCache,$http){
    $http.get('html/const.html', {cache:$templateCache});
    $http.get('html/step.html', {cache:$templateCache});
    $http.get('html/sine.html', {cache:$templateCache});
    $http.get('html/arb.html', {cache:$templateCache});
});
//Directive for experiments, directs loading of the html file
app.directive('myExperiment', function(){
    return {
        restrict: 'A',
        templateUrl: 'html/experiment.html',
        transclude: false,
        scope: {
            experiment: '=myExperiment',
            device: '=device'
        }
    };
});
//Directive for the waveforms, directions conditional loading of the waveform html file
app.directive('myWaveform',['$compile', '$templateCache', function ($compile, $templateCache) {
    return {
        scope: {
            waveform: '=myWaveform',
            device: '=device'
        },
        restrict: 'A',
        link: function(scope, element) {
            //Creates variables for HandsonTables
            scope.arbData=[
                ["Initial", "0"]
            ];
            scope.tableSettings = {
                colHeaders: ["Time[s]", "Intensity"],
                contextMenu: false,
                height: 100,
                width: 170,
                minSpareRows: 1,
                //Validation
                columns: [{
                    type: 'numeric'
                }, {
                    type: 'numeric'
                }],
                cells: function (row, col, prop) {
                    var cellProperties = {}
                    if (row === 0 && col === 0) {
                        cellProperties.readOnly = true;
                        type = "string"
                    }
                    return cellProperties;
                },
                //Data source
                data: scope.arbData
            };
            var template = $templateCache.get(scope.waveform.file)[1];
            element.html(template);
            $compile(element.contents())(scope);
        }
    };
}]);