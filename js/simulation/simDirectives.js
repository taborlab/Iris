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
            console.log(event);
        });
    };
});
//Used to color dropdown to select LEDs
app.directive('optionStyle', function ($compile, $parse) {return {
        restrict: 'A',
        link: function optionStylePostLink(scope, elem, attrs) {
            var updateSelect = function (newValue) {
                console.log("updating select");
                angular.forEach(newValue, function (child) {
                    var child = angular.element(child);
                    var val   = child.val();
                    if (val) {
                        child.attr('ng-style', 'getColorStyle('+val+')');
                        $compile(child)(scope);
                    }
                });
            };
            scope.$watchCollection(function () {return elem.children();},updateSelect);
            scope.$watch('getDevice()',updateSelect);
        }
    };
});