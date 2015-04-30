app.service('formData', function () {
    var data={
        device: {
            name: 'default',
            "rows": 8,
            "cols": 12,
            "leds": [630, 660],
            "display": "none"

        },
        experiments: [],
        param:{}
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
app.service('plate',function(){
    var plate = null;
    return {
        get: function() {
            return plate;
        },
        set: function(value) {
            plate=value;
        }
    }
})