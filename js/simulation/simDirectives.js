//Watches for clicks on the simulation
app.directive('watchClick', function() {
    return function(scope, element, attrs) {
        element.bind('click', function(e){
            scope.handleClick(e);
        })
    }
})