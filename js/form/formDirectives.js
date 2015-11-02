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
            var template = $templateCache.get(scope.waveform.file)[1];
            element.html(template);
            $compile(element.contents())(scope);
            if(scope.waveform.type === "arb") {
                //Creates variables for HandsonTables
                scope.waveform.arbData = [
                    ["Initial", "0"]
                ];
                scope.arbTable = new Handsontable(element.find(".arbData")[0], {
                    colHeaders: ["Time[min]", "Intensity"],
                    contextMenu: ["row_above", "row_below", "remove_row", "undo", "redo"],
                    height: 120,
                    width: 170,
                    copyRowsLimit: 10000,//Default is 1000, hopefully 10 fold more doesn't break it
                    minSpareRows: 3,
                    stretchH: 'all',
                    //Validation
                    columns: [{
                        type: 'numeric',
                        format: '0.000'
                    }, {
                        type: 'numeric'
                    }],
                    cells: function (row, col, prop) {
                        var cellProperties = {}
                        if (row === 0 && col === 0) {
                            cellProperties.readOnly = true;
                            cellProperties.type = "text";
                            cellProperties.className = "htRight"
                        }
                        return cellProperties;
                    },
                    //Data source
                    data: scope.waveform.arbData
                });
                Handsontable.hooks.add("afterChange",function(changes, source){
                    console.log("triggered");
                    scope.arbTable.validateCells(function(valid){
                        scope.waveform.handsonTableValid = valid;
                    });
                },scope.arbTable);
                //Watches for changes made by the controller when a file is loaded, does not watch for changes to indvidual
                //cells, handsontable handels that
                scope.$watchCollection('waveform.arbData', function () {
                    scope.arbTable.render();
                }, true);
            }
        }
    };
}]);
