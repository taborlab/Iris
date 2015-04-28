app.controller('simController',['$scope', 'formData', function($scope,formData) {
    $scope.getDevice = function(){return formData.getData().device}
}]);