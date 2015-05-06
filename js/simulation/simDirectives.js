//Watches for clicks on the simulation
app.directive('watchClick', function() {
    return function(scope, element, attrs) {
        element.bind('click', function(e){
            scope.handleClick(e);
        })
    }
})
app.directive('resize', function ($window) {
    return function (scope, element) {
        var angularElement = angular.element(element);
        scope.getWindowDimensions = function () {
            return { 'h': angularElement.height(), 'w': angularElement.width() };
        };
        scope.$watch(scope.getWindowDimensions, function (newValue, oldValue) {
            scope.size.height = newValue.h;
            scope.size.width = newValue.w;
        }, true);
        scope.size={};
        angularElement.bind('resize', function () {
            scope.$apply();
        });
    }
})