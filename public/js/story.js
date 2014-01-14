var scale = 1.0;
var startScale;
var lastCenter;

var xNew = 0;
var yNew = 0;
var xLast = 0;  // last x location on the screen
var yLast = 0;  // last y location on the screen
var xImage = 0; // last x location on the image
var yImage = 0; // last y location on the image
    
var MOUSEWHEEL_SCALE = .005;
var MIN_SCALE = .1, MAX_SCALE = 4;

// "dropbox" or "node"
var dataMode = "dropbox";

var APP_KEY = "qmqi08m3143grgb";
var client, datastoreManager, bubbleTable;

//var scrollerObj;

$(document).ready(function () {
	// this didn't work with jquery.contextmenu.js:
//	FastClick.attach(document.body);
	
	loadStory();
	
	initializeUI();
	
	$("#diagram").mousewheel(onDiagramMouseWheel);
	$("#diagram_outer").on("gesturestart", onPinchStart);
	$("#diagram_outer").on("gesturechange", onPinch);
	$("#diagram_outer").on("gestureend", onPinchEnd);
	$("#diagram_outer").on("touchstart", onTouch);

	// try to prevent page scrolling (on the iPad) except for the text areas
	$("body").on("touchmove", function (e) {
			if ($(e.target).prop("tagName") == "TEXTAREA") {
			} else {
				e.preventDefault();
			}
		});		
});

function windowlog (s) {
	$("#logger").val($("#logger").val() + s + "\n");
}

function getEventCenter (event) {
	var pt = {};
	
	if (event.originalEvent.touches.length == 2) {
		var x1 = event.originalEvent.touches[0].pageX;
		var y1 = event.originalEvent.touches[0].pageY;
		var x2 = event.originalEvent.touches[1].pageX;
		var y2 = event.originalEvent.touches[1].pageY;
		pt.x = (x1 + x2) * .5;
		pt.y = (y1 + y2) * .5;
	} else {
		pt.x = event.originalEvent.touches[0].pageX;
		pt.y = event.originalEvent.touches[0].pageY;
	}
	return pt;
}

function onTouch (event) {	
	lastCenter = getEventCenter(event);
//	windowlog(lastCenter.x + " " + lastCenter.y);
}

function initializeStorage () {
	client = new Dropbox.Client( {key: APP_KEY} );

	// Try to finish OAuth authorization.
	client.authenticate({interactive: false}, function (error) {
		if (error) {
			alert('Authentication error: ' + error);
		}
	});

	if (client.isAuthenticated()) {
		// Client is authenticated. Display UI.
		datastoreManager = client.getDatastoreManager();
		datastoreManager.openDefaultDatastore(function (error, datastore) {
			if (error) {
				alert('Error opening default datastore: ' + error);
			}

			bubbleTable = datastore.getTable('bubbles');
			
			var bubbles = bubbleTable.query();
			var ar = [];
			for (each in bubbles) {
				ar.push(bubbles[each].getFields());
			}
			onReceiveStory(ar);
		});
	}
}

function getDropboxRecord (id) {
	var recs = bubbleTable.query( { id: id } );
	if (recs.length > 0) {
		return recs[0];
	} else {
		// new record
		return bubbleTable.insert( { id: id } );
	}
}

function onClickLogin (event) {
	client.authenticate();
}

function loadStory () {
	if (dataMode == "node") {
		$.getJSON("/story", onReceiveStory);
	} else if (dataMode == "dropbox") {
		initializeStorage();
	}
}

function initializeUI () {
	$("#splitter").height($("body").height());
	
//	$("#splitter").splitter();

	$("#diagram").draggable( { start: onStartDraggingDiagram, stop: onStopDraggingDiagram } );

	$("button").button();
	
	$("#addButton").click(onClickAddBubble);
	$("#loginButton").click(onClickLogin);
	
//	Draggable.create("#words_container", { type:"scrollTop", edgeResistance:0.5, throwProps:true });

/*
	scrollerObj = new Scroller(function(left, top, zoom) {
		// apply coordinates/zooming
//		console.log(left + " " + top);
		$("#diagram").css("-webkit-transform", "scale(" + zoom + ") translateX(" + left + "px) translateY(" + top + "px)");
	}, {
			zooming: true,
			scrollingX: false,
			scrollingY: false,
			paging: false,
			bouncing: false,
			locking: false,
			minZoom: .5,
			maxZoom: 1.1,
		}
	);
	var diagram_outer = $("#diagram_outer");
	scrollerObj.setDimensions(diagram_outer.width(), diagram_outer.height(), 1000, 1000);//3000, 3000);
	var client_left = diagram_outer.offset().left, client_top = diagram_outer.offset().top;
	scrollerObj.setPosition(client_left, client_top);
*/
}

function finalizeUI () {
	// don't have transitions on the textarea upon initial load
	
	// trigger a reflow before the class is changed
	document.body.offsetWidth;
	
	$("#words").sortable( { handle: ".handle" } );
	
	$("#words textarea").addClass("textarea-transition");
}

function onReceiveStory (data) {
	$.each(data, function (index, item) {
		createBubble(item);		
	});
	
	finalizeUI();
}

function createBubble (item) {
	var el = $("<div>").offset( { left: item.left, top: item.top } ).addClass("bubble").attr("id", item.id).append("<div class='editable'>" + item.text).appendTo("#diagram");//.text(item.text).appendTo("#diagram");
	
	if (item.width) {
		el.width(item.width);
	}
	if (item.height) {
		el.height(item.height);
	}

	el.draggable( {	start: onStartDraggingBubble,
					drag: onDraggingBubble,
					stop: onStopDraggingBubble
				} );
				
	el.resizable( { stop: onStopResizingBubble } );
	
	el.click(onClickBubble);
//	el.dblclick(onDoubleClickBubble);

	el.find(".editable").editable( { toggleFontSize : false, event: "", lineBreaks: true, callback: onEditBubble } );
	el.find(".editable").on("edit", onEditBubble);

	if (jQuery.browser.mobile)
		el.bind("taphold", onTapHoldBubble);
	
	addMenuTo("#" + item.id);
	
	// add words
	// TODO: clean this up:
	var w = $("<textarea>");
	w.attr("id", "w_" + item.id);
	w.text(item.contents);
	var caption = item.text.replace(/<br\/\>/g, " ");
	var x = $("<li>").append(w).append("<div class='handle'><p class='handle-text'>" + caption);
	x.appendTo("#words");
	
	// this (jquery-mobile) will give it a nice rounded, shaded look but it's kinda overkill
//	w.textinput();

	w.autosize();
	w.bind("input propertychange", onChangeContents);
	
	// adjust handle height for margins between <li>
	var h = x.find(".handle");
	h.width(x.height() - 4);
	
	return el;
}

function onChangeContents (event) {
	var id = event.target.id.substr(2);
	
	var contents = $(event.target).val();
	
	updateBubbleContents(id, contents);
}

function onTapHoldBubble (event) {
	$(event.target).contextMenu();
}

function addMenuTo (id) {
	$.contextMenu({
			selector: id,
			callback: function(key, options) {
				if (key == "delete") {
					// TODO: confirm?
					deleteBubble(options.selector.substr(1));
				} else if (key == "edit") {
					editBubbleCaption($(options.selector));
				} else if (key == "write") {
					gotoBubbleWriter($(options.selector));
				}
			},
			items: {
				"edit": { name: "Edit" },
				"write": { name: "Write" },
				"delete": {name: "Delete", icon: "delete"},
			}
		});
}

function getBubbleFromTarget (elem) {
	if (!elem.hasClass("bubble"))
		elem = elem.parent(".bubble");
	return elem;
}

function onBubbleMenuSelect (event, ui) {
	if (ui.cmd == "del") {
		var bubble = getBubbleFromTarget($(ui.target));
		var id = bubble.attr("id");
		deleteBubble(id);
	}
}

function deleteBubble (id) {
	console.log("deleting " + id);
	
	$("#"+ id).remove();
	$("#w_" + id).remove();
	
	if (dataMode == "node") {
		$.post("/delete/" + id, {}, onUpdateCallback);
	} else {
		var rec = getDropboxRecord(id);
		rec.deleteRecord();
	}
}

function onDiagramMouseWheel (event, delta, deltaX, deltaY) {
	event.preventDefault();
	
	var oldScale = scale;
	
	scale += -deltaY * MOUSEWHEEL_SCALE;
	if (scale < MIN_SCALE) scale = MIN_SCALE;
	else if (scale > MAX_SCALE) scale = MAX_SCALE;

	zoomOnPoint(event.pageX, event.pageY, oldScale);
}

function zoomOnPoint (xScreen, yScreen, oldScale) {
	// find current location on the image at the current scale
	xImage = xImage + ((xScreen - xLast) / oldScale);
	yImage = yImage + ((yScreen - yLast) / oldScale);

	// determine the location on the screen at the new scale
	xNew = (xScreen - xImage) / scale;
	yNew = (yScreen - yImage) / scale;

	// save the current screen location
	xLast = xScreen;
	yLast = yScreen;

	// redraw
	$("#diagram").css('-webkit-transform', 'scale(' + scale + ')' + 'translate(' + xNew + 'px, ' + yNew + 'px' + ')')
		.css('-webkit-transform-origin', xImage + 'px ' + yImage + 'px');
}

function onPinchStart (event) {
	startScale = scale;
}

function onPinchEnd (event) {
}

// TODO: throttle this?
function onPinch (event) {
	var s = event.originalEvent.scale;
	
	var oldScale = scale;
	
	scale = startScale * s;
	if (scale < MIN_SCALE) scale = MIN_SCALE;
	else if (scale > MAX_SCALE) scale = MAX_SCALE;
	
	zoomOnPoint(lastCenter.x, lastCenter.y, oldScale);
}

function onEditBubble (data) {
	if (data.content) {
		// reset bubble to inline
		$(data.$el).css("display", "inline-block");
		$(data.$el).css("width", "auto");
		
		updateBubbleText(data.$el.parent());
	}
}

function onClickBubble (event) {
	var bubble = getBubbleFromTarget($(event.target));
	
	var alreadySelected = $(bubble).hasClass("selected");
	
	$(".selected").removeClass("selected");
	$(bubble).addClass("selected");
	
	/*
	var elem = $("#w_" + $(bubble).attr("id"));
	console.log(elem.hasClass("highlighted"));
	if (!elem.hasClass("highlighted")) {
		$(".highlighted").removeClass("highlighted");
		elem.addClass("highlighted");
		elem.effect("highlight", {}, 1000);
	}
	*/
	
	var elem = $("#w_" + $(bubble).attr("id"));
	
	if (alreadySelected) {
		gotoBubbleWriter(bubble);
	} else {
		elem.effect("highlight", {}, 1000);
	}
	
	// scroll to corresponding text	
	$("#words_container").animate( { scrollTop: elem.offset().top } );
}

function onDoubleClickBubble (event) {
	var bubble = getBubbleFromTarget($(event.target));
	
	gotoBubbleWriter(bubble);
}

function gotoBubbleWriter (bubble) {
	var elem = $("#w_" + $(bubble).attr("id"));
	elem.effect("highlight", {}, 1000);
	elem.focus();
	var len = elem.val().length;
	elem[0].setSelectionRange(len, len);
}

function editBubbleCaption (bubble) {
	var b = bubble.find(".editable");
	
	b.parent().css("display", "block");
	var w = b.parent().width();
	b.width(w);
	b.editable("open");
}

function removeTransformOrigin () {
	var pt = $("#diagram").offset();
	xNew = pt.left / scale;
	yNew = pt.top / scale;

	$("#diagram").css('left', 0);
	$("#diagram").css('top', 0);
	
	xImage = 0;
	yImage = 0;
	xLast = pt.left;
	yLast = pt.top;

	// redraw
	$("#diagram").css('-webkit-transform', 'scale(' + scale + ')' + 'translate(' + xNew + 'px, ' + yNew + 'px' + ')')
		.css('-webkit-transform-origin', xImage + 'px ' + yImage + 'px');	
}

function onStartDraggingBubble (event, ui) {
	removeTransformOrigin();
}

function onDraggingBubble (event, ui) {
	var dx = (ui.position.left - ui.originalPosition.left) / scale;
	var dy = (ui.position.top - ui.originalPosition.top) / scale;

	ui.position.left = ui.originalPosition.left / scale + dx;
	ui.position.top = ui.originalPosition.top / scale + dy;
}

// TODO: create in-memory copies of the story, for undo/rollback purposes
function updateBubbleData (id, data) {
	if (dataMode == "node") {
		$.post("/story/" + id, data, onUpdateCallback);
	} else if (dataMode == "dropbox") {
		var rec = getDropboxRecord(id);
		rec.update(data);
	}
}

function onStopDraggingBubble (event, ui) {
	var id = event.target.id;
	var data = { left: ui.position.left, top: ui.position.top };
	
	updateBubbleData(id, data);	
}

function onStopResizingBubble (event, ui) {
	var id = event.target.id;
	var data = { width: ui.size.width, height: ui.size.height };
	
	updateBubbleData(id, data);
}

function sortByID (a, b) {
	var id_a = a.id.substr(1);
	var id_b = b.id.substr(1);
	return (id_a < id_b ? -1 : 1);
}

function onClickAddBubble (event) {
	var next_id = 1;
	
	var bubbles = $("div.bubble");
	if (bubbles.length > 0) {
		bubbles.sort(sortByID);
	
		next_id = Math.floor(bubbles[bubbles.length - 1].id.substr(1)) + 1;
		
		var newBubble = { left: 100, top: 100, id: "b" + next_id, text: "New bubble.", contents: "Contents of new bubble." };
		var elem = createBubble(newBubble);
		updateBubble(elem);
	}
}

function onUpdateCallback (data) {
}

function updateBubbleContents (id, contents) {
	var data = { id: id, contents: contents };
	
	updateBubbleData(id, data);
}

function updateBubble (elem) {
	var id = elem.attr("id");
	
	var data = { id: elem.attr("id"), text: elem.find(".editable")[0].innerHTML,
					left: elem.offset().left, top: elem.offset().top,
					width: elem.width(), height: elem.height(),
					contents: $("#w_" + id).val() };
	
	updateBubbleData(id, data);
}

function updateBubbleText (elem) {
	var id = elem.attr("id");
	
	var data = { text: elem.find(".editable")[0].innerHTML };
	
	updateBubbleData(id, data);
}

function onStartDraggingDiagram (event) {	
	$("#diagram").css('transform', "scale(" + scale + ")");
	$("#diagram").css('-webkit-transform-origin', "0 0");
		
	$("#diagram").css('left', xImage * scale);
	$("#diagram").css('top', yImage * scale);
}

function onStopDraggingDiagram () {
	removeTransformOrigin();
}