app.service('formData', function () {
    var data={
        device: null,
        experiments: []
    };
    var experiments=null;
    return{
        getData: function() {
            return data;
        },
        setDevice: function(value){
            data.device = value;
        }
    }
});