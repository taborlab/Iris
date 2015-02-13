/* -----------------------------------------------------------------
The functions within this file work to aminate the UI of the LPI. 
No canvas manipulation or backend computation related to simulating
plate devices is contained within this .js file.
--------------------------------------------------------------------*/

// Drag function for the popup intensity graph


$(document).ready(function () {
	// drag pupup intensity graph
	$(function() {
    	$(".popup-graph").draggable();
	});
});