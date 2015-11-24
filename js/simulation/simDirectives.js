//Watches for left clicks on the simulation
app.directive('watchClick', function() {
    return function(scope, element, attrs) {
        element.bind('click', function(e){
            scope.handleClick(e, 'left');
        })
    }
})
//Watches for right clicks on the simulation
app.directive('watchRightClick', function() {
    return function(scope, element, attrs) {
        element.bind('contextmenu', function(e) {
            e.preventDefault();
            scope.handleClick(e, 'right');
        })
    }
})
app.directive('resize', function ($window) {
    return function (scope, element) {
        var angularElement = angular.element(element);
        scope.size={};
        scope.getWindowDimensions = function () {
            return { 'h': angularElement.height(), 'w': angularElement.width() };
        };
        scope.$watch(scope.getWindowDimensions, function (newValue, oldValue) {
            scope.size.height = newValue.h;
            scope.size.width = newValue.w;
        }, true);
        angular.element($window).bind('resize', function() {
            scope.$apply();
        });
    }
})

app.directive('keyTrap', function() {
    return function( scope, elem ) {
        elem.bind('keydown', function( event ) {
            scope.$broadcast('keydown', { code: event.keyCode } );
        });
    };
});