function updateLEDnum(){
    var newLEDnum = $("#LEDnum").val();
    var currentLEDs= $("#LEDs").children().not(".template");
    if (currentLEDs.length > newLEDnum) {
        currentLEDs.each(function (index, elem) {
            if(index >= newLEDnum) {
                $(elem).remove();
                console.log("Removed LED");
            }
        });
    }
    else if (currentLEDs.length <newLEDnum) {
        for(var i=0;i<newLEDnum-currentLEDs.length;i++) {
            $("#LEDs").append($("#LEDs").children().filter(".template").clone().removeClass("template"));
            console.log("Added LED");
        }
    }
}
$("#LEDnum").change(function () {
    console.log("number of LEDs changed to " + $(this).val());
    updateLEDnum();
});
$("#color1").change(function () {
    console.log("color change");
});