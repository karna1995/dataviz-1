/**
 * JavaScript module for the Dataviz app.
 * 
 * @author: Prahlad Yeri  (prahladyeri@yahoo.com)
 * */

var conn = {}; //connection information
var tables = {}; //currently selected data sources
var currentTable = ""; //currently selected table for SQL "from" clause
var currentDimensions = []; //currently dragged into rows/columns box for SQL "group by" clause
var currentMeasures = []; //currently dragged into rows/columns box for SQL "select" clause (sum/avg/etc.)
var currentChartType = 'line';
var lastSQL = ""; //last successfully executed sql statement
var lastChartData = {}; //last successful data used to draw the chart
var lastEnvList = [];
var filters = {}; //dict for all filters, pattern: name=>Filter.
var numTypes = ["float", "double", "decimal", "int", "integer", "smallint",
    "tinyint", "mediumint", "bigint"];
var dateTypes = ["datetime", "date"];
var env = "";
var pauseChartingFlag = false;

//TODO: Remove unncessary comments.
//TODO: Remove unncessary console.log statements.
//TODO: Try and reduce dependency on window.* variables.

/**
 * To be called when used with index.html once its loaded.
 * */
function init()
{
    $.get("js/modals.dat", function(data) {
        $('body').append(data);
        return;
    });
    
    //JQUERY-UI DEFAULTS
    $.datepicker.setDefaults({
        dateFormat: 'yy-mm-dd'
    });
    
    clearChart();
    fetchEnvs();
    fetchDashes();
	conn = localStorage.getItem("conn");
    if (getQueryString("ref") == null) {
		console.log("ref is null");
		if (conn==null) {
			conn={};
			showConnectDialog();
		} else {
			conn = JSON.parse(conn);
			if (conn.Type == undefined) conn.Type = "mysql";
			showConnectDialog();
			$("#connectDialog .refresh").addClass("spinning");
			connect();
		}
	}
	else {
		//restore the stale state
		console.log("ref is not null");
		var stale = localStorage.getItem("stale");
		if (stale != null && stale.length > 0) {
			restoreEnvFromJSON(stale);
		}
		//Remove querystring from the href.
		//http://stackoverflow.com/questions/10970078/modifying-a-query-string-without-reloading-the-page
		if (history.pushState) {
			//var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?myNewUrlQuery=1';
			var tag = (getQueryString("tag")==null ? "" : "?tag=" + getQueryString("tag"));
			console.log("TAGGG...",tag);
			var newurl = getPathFromUrl(window.location.href)  + tag;
			console.log(newurl);
			window.history.pushState({path:newurl},'',newurl);
			//window.location.href = newurl + "#abc";
		}
		else {
			window.location.href =  window.location.href + "#abc";
		}
		
	}
    handlers();
}

/**
 * Body level event handlers for various buttons, labels, etc.
 * */
function handlers() {
	$("body").on("click", "input[type='radio']", function() {
		var name = $(this).attr("name");
		if (name=="txtConnType") {
			if ($("input[name='txtConnType']:checked").val() == "mysql") {
				$("#txtPort").val("3306");
			}
			else if ($("input[name='txtConnType']:checked").val() == "pgsql") {
				$("#txtPort").val("5432");
			}
			else if ($("input[name='txtConnType']:checked").val() == "redshift") {
				$("#txtPort").val("5439");
			}
			else {
				$("#txtPort").val("0");
			}
		}
		
	});
	
    $("body").on("click", "#ddnrestore .dropdown-menu li a", function() {
        restoreEnv($(this).text());
    });
    
    $("body").on("click", "#ddndash .dropdown-menu li a", function() {
		localStorage.setItem("stale", saveEnvToJSON()); //backup the current env.
		
		var f = $(this).text();
		if (f.indexOf("New Dash")>-1) {
			nurl = "/dash.html";
			if (getQueryString("tag")!=null) nurl += "?tag=" + getQueryString("tag");
			window.location = nurl;
		}
		else {
			//restoreDash(f);
			nurl = "/dash.html?file=" + f;
			if (getQueryString("tag")!=null) nurl += "&tag=" + getQueryString("tag");
			window.location = nurl;
		}
    });
    
    $("body").on("click", ".table-button", function(){
        //showConnectDialog();
        refreshTablesDialog();
    });
    
    $("body").on("click", ".filter-button", function(){
        showFilterDialog($(this));
    });
    
    //http://stackoverflow.com/questions/19032597/javascript-event-binding-persistence
    $("body").on('click', '.dropdown.dimension li a, .dropdown.measure li a', function() {
        console.log("body.clicked");
        var text = $(this).text().toUpperCase();
        var theParent  = $(this).parents("span.dropdown").find("#label");
        if (text == "DIMENSION") {
            theParent.text(theParent.parent().attr("field"));
            theParent.append('<span class="caret"></span>');
            theParent.removeClass('btn-success').addClass('btn-info');
        } else if (text == 'REMOVE') {
            var thePanelBody = theParent.parent().parent();
            theParent.parent().remove();
            if (thePanelBody.find(".dropdown").length==0) {
                thePanelBody.append(getHTMLTeaser());
            }
        } else if (text.indexOf('MEASURES')==0) {
            return; //This is just a placeholder
        } else { //summary
            var theSummary = text;
            if (theSummary == 'AVERAGE') theSummary='AVG';
            theParent.text(theSummary + "(" + theParent.parent().attr("field") + ")");
            theParent.append('<span class="caret"></span>');
            theParent.removeClass('btn-info').addClass('btn-success');
        }
        drawTheChart();
    });    
}

function exportToCSV() {
    console.log("exportToCSV()");
    if (lastSQL=="") {
        bspopup({
            text: "No executed SQL statement found."
        });
        return;
    }
    var tdata = $.extend({}, conn);
	tdata.SQL = lastSQL,
	tdata.CSV = "true"
   $.ajax({
        url: "app.php",
        type: "POST",
        data: tdata,
        success: function(data) {
            if (data=="success") window.location = "output.csv"
        },
        error: function(response) {
            bspopup(response);
        }
        });
}

function getHTMLTeaser() {
    return '<SMALL id="teaser">DROP HERE</SMALL>';
}

function drag(ev) {
    var theData;
    if (ev.target.id=="label") {
        theData = $(ev.target).attr("iden");
    }
    else {
        theData = ev.target.id;
    }
    ev.dataTransfer.setData("text", theData);
}

function drop(ev) {
    ev.preventDefault();
    var data = ev.dataTransfer.getData("text");
    var control;
    console.log(data);
    if (data.indexOf("idf_")>-1) {
        control = $("[iden='" + data + "']");
    }
    else {
        control = $("#" + data);
    }
    if (control.attr("id") == 'label') {
        //a row/column button is dragged outside
        console.log('id==label');
        if (ev.target.id=='label') return;
        if (control.parent().attr("id").indexOf("genericMenu")==-1) return;
        if (ev.target.id.indexOf('panelBodyColumns')>-1
            ||  ev.target.id.indexOf('panelBodyRows')>-1)
            return;
        var thePanelBody = control.parent().parent();
        console.log("Now removing ", control.parent());
        control.parent().remove();
        console.log('removed the label parent control.');
        if (thePanelBody.find(".dropdown").length==0) {
            console.log('.dropdown not found, adding teaser.');
            thePanelBody.append(getHTMLTeaser());
        }
        drawTheChart();
        return;
    }
    else if (control.hasClass('measure') || control.hasClass('dimension')) {
        //One of the measure/dimension buttons on the bottom left
        if ( $(ev.target).attr("id")=="panelBodyFilters" || $(ev.target).parent().attr("id") == "panelBodyFilters" 
            && (control.hasClass("measure") || control.hasClass("dimension")) ) {
                showFilterDialog(control);
            return;
        }
        else if (ev.target.id == "teaser" || ev.target.id=="teaserSmall") {
            console.log("if teaser", ev.target.parentElement, ev.target.parentElement.id);
            theParent = ev.target.parentElement;
        }
        else if (ev.target.id=="panelBodyRows" || ev.target.id=="panelBodyColumns") {
            theParent = ev.target;
        }
        else if (ev.target.id=="label") {
            console.log("if label");
            theParent = ev.target.parentElement.parentElement;
        }
        else if (($(ev.target).hasClass("measure") ||  $(ev.target).attr("id")=="panelBodyMeasures") 
            && control.hasClass("dimension")) {
            //dimension dragged into measure
            theParent = $("#panelBodyMeasures")[0];
            control.removeClass("dimension");
            control.addClass("measure");
            control.appendTo($(theParent));
            return;
        }
        else if (($(ev.target).hasClass("dimension") || $(ev.target).attr("id")=="panelBodyFilters" )
            && control.hasClass("measure")) {
            //measure dragged into dimension
            theParent =  $("#panelBodyDimensions")[0];
            control.removeClass("measure");
            control.addClass("dimension");
            control.appendTo($(theParent));
            return;
        }
        else {
            return;
        }
    }
    //Continue handling for rows/columns drop only.
    var theText = control.text();
    
    var theField = $("#genericMenu").clone();
    theField.removeClass("hidden");
    theField.attr("id", "genericMenu" + theText);
    theField.attr("field", theText);
    theField.attr("draggable", true);
    theField.attr("ondragstart", "drag(event)");

    if (control.hasClass("measure")) {
        theField.addClass("measure");
        theField.find("#label").text("COUNT(" + control.text() + ")")
            .removeClass("btn-info")
            .addClass("btn-success");
    } else if (control.hasClass("dimension")) {
        theField.addClass("dimension");
        theField.find("#label").text(control.text());
    }
    theField.find("#label").attr("iden", "idf_" + (new Date()).getTime());
    theField.find("#label").append('<span class="caret"></span>');
    $(theParent).append(theField);
    $(theParent).find("#teaser").remove();
    
    currentMeasures = [];
    currentDimensions = [];
    drawTheChart();
}

/**
 * Shows the filter dialog.
 * 
 * @param control jQuery control object
 * */
function showFilterDialog(control) {
    //measure dragged into dimension
    var theType = "";
    var theField = control.text();
    var isDragdrop = false;
    var filter = null;
    if (control.hasClass("measure") || control.hasClass("dimension")) {
        //case of a drag/drop.
        isDragdrop = true;
        if (control.hasClass("measure")) {
            theType = "number";
        }
        else if(dateTypes.indexOf(tables[currentTable].fields[theField].dataType) >-1 ) {
            theType = "date";
            console.log(tables[currentTable].fields[theField].dataType);
        }
        else {
            theType = "string";
        }
        if (filters.hasOwnProperty(theField)) {
            filter = filters[theField];
            console.log("Filter already exists.");
        }
        else {
            filter = new Filter(theField, theType);
            filters[theField] = filter;
        }
    }
    else {
        //case of just changing existing filter.
        console.log("case of changing filter: ", theField);
        filter = filters[theField];
        theType = filter.type;
        isDragdrop = false;
    }

    console.log("isDragdrop", isDragdrop);
    //$('#filter' + theField).remove(); //remove old one first
    
    //add a filter control
    if (theType=="string") {
        $(".filterString .applyButton").unbind("click");
        console.log("now binding .applyButton.click", $(".filterString .applyButton").length);
        $(".filterString .applyButton").click(function() {
            //if ($('#filter' + theField).length>=1) return;
            console.log("click() .filterString .applyButton");
            $('#filter' + theField).remove(); //remove old filter buttons
            $("#panelBodyFilters").append("<button id='filter" + theField + "' class='filter-button btn btn-xs btn-default " + theType + "'>" + theField + "<span class='glyphicon glyphicon-filter'></span></button>");
            $(".filterString").modal('hide');
            if ($(".filterString li.general").hasClass("active")) {
                filter.stringMatcher = "general";
            }
            else {
                filter.stringMatcher = "wildcard";
            }
            filter.stringGeneral = [];
            $(".filterString .stringValue:checked").each(function(){
                console.log('Saving string value ', $(this).val());
                filter.stringGeneral.push($(this).val());
            });
            filter.stringGeneralExclude = $("#generalExclude").prop("checked");
            filter.stringWcValue = $("#txtWcValue").val();
            filter.stringWcType = $("input[name='WcType']:checked").val();
            filter.stringWcIncludeAll = $("#WcIncludeAll").prop("checked");
            filter.stringWcExclude = $("#WcExclude").prop("checked");
            drawTheChart();
        });
        $(".filterString .clearButton").unbind("click");
        $(".filterString .clearButton").click(function() {
            $('#filter' + theField).remove(); //remove old filter buttons
            if (!filters.hasOwnProperty(theField)) return;
            delete filters[theField];
            drawTheChart();
        });
        console.log("now pulling values from db");
        var data = $.extend({}, conn);
        var sql = "";
        if (currentTable=="performance_schema.CustomSQL") {
            sql = "SELECT distinct " + theField + " FROM (" + $("#txtCustomSQL").val().replace(";","") + ") foo"
        }
        else {
            sql = "SELECT distinct " + theField + " FROM " + currentTable 
        }
        data.SQL = sql;
        $.ajax({
            url: "app.php",
            method: "POST",
            data: data,
            success: function(data) {
                //SHOW THE STRING-FILTER DIALOG
                $(".filterString .modal-title").text("Filter for " + theField);
                var rows = JSON.parse(data);
                var htmldata = "";
                for(var i=0;i<rows.length;i++) {
                    var attr = '';
                    if (filter.stringGeneral.indexOf(rows[i][0])>-1) {
                        attr = 'checked';
                    }
                    htmldata += '<div><label><input class="stringValue" type="checkbox" ' + attr + ' value="' + rows[i][0] +  '">&nbsp;' + rows[i][0]  + '</label></div>';
                }
                $(".filterString .stringCheckBoxes").html(htmldata);
                $("#txtWcValue").val(filter.stringWcValue);
                $("input[name='WcType']").filter("[value='" + filter.stringWcType  + "']").prop("checked",true);
                $("#WcIncludeAll").prop("checked", filter.stringWcIncludeAll);
                $("#WcExclude").prop("checked", filter.stringWcExclude);
                $(".filterString .nav-tabs li." + filter.stringMatcher + " a").tab('show');
                
                $(".filterString").modal('show');
            },
            complete: function() {
            }
        });
        
    }
    else if (theType=="number") {
        //SHOW THE NUM-FILTER-TYPE DIALOG FIRST
        $(".filterNumericType").modal('show');
        $(".filterNumericType .filterType").unbind('click');
        $(".filterNumericType .filterType").click(function() {
            $(".filterNumericType").modal('hide');
            //alert($(this).text());
            filter.numIsDistinct = false;
            var oper  = $(this).text().toLowerCase();
            if (oper.indexOf("remove filter")>-1) {
                $('#filter' + theField).remove(); //remove old filter buttons
                delete filters[theField];
                return;
            }
            else if (oper.indexOf("sum")>-1) {
                oper = "sum";
            }
            else if (oper.indexOf("distinct count")>-1) {
                oper = "count";
                filter.numIsDistinct = true;
            }
            else if (oper.indexOf("count")>-1) {
                oper = "count";
            }
            else if (oper.indexOf("maximum")>-1) {
                oper = "max";
            }
            else if (oper.indexOf("minimum")>-1) {
                oper = "min";
            }
            else if (oper.indexOf("average")>-1) {
                oper = "avg";
            }
            else if (oper.indexOf("all values")>-1) {
                oper = "all";
            }
            if (oper != "all" && currentDimensions.length == 0) {
                bspopup("No dimensions are selected. At least one is needed for group-by clause.");
                $('#filter' + theField).remove(); //remove old filter buttons
                delete filters[theField];
                return;
            }
            //QUERY THE DATABASE FOR MIN-MAX RANGES & VALUES
            var clause = (oper=="all"?theField:oper + "(" + theField + ")");
            if (currentTable=="performance_schema.CustomSQL") {
                sql = "SELECT distinct " + clause + " FROM (" + $("#txtCustomSQL").val().replace(";","") + ") foo"
                + (oper=="all"?"":"GROUP BY " + currentDimensions[0]) + " ORDER BY " + clause.replace("distinct", "");
                 
            }
            else {
                sql = "SELECT distinct "  + clause + " FROM " + currentTable + " "
                + (oper=="all"?"":"GROUP BY " + currentDimensions[0]) + " ORDER BY " + clause.replace("distinct", "");
            }
            //TODO: Skip this whole below query process if values are found in cache.
            doTestCustomSQL({
                silent: true,
                sql: sql,
                success: function(data) {
                    //SHOW THE NUM-FILTER DIALOG
                    $(".filterNumeric .modal-title").text("Filter for " + theField);
                    var result = JSON.parse(data);
                    if (result.length==0) {
                        bspopup("Zero rows returned.");
                        return;
                    }
                    //data = JSON.parse(data);
                    window.result = result;
                    var minValue = Number(result[0][0]);
                    var maxValue = Number(result[result.length-1][0]);
                    var theOperLabel = "";
                    if (oper=="all") {
                        theOperLabel = theField;
                    }
                    else {
                        theOperLabel = oper + "(" + theField + ")";
                    }
                    //RANGE SLIDER
                    $(".filterNumeric .rangeSlider").slider({
                        range: true, min: minValue, max: maxValue,
                        values: [minValue, maxValue],
                        slide: function(event, ui) {
                            $(".filterNumeric .rangeValue").text(theOperLabel + " between " + ui.values[0] + " - " + ui.values[1]);
                        }
                    });
                    //GTE SLIDER
                    $(".filterNumeric .gteSlider").slider({
                        range: "min", min: minValue, max: maxValue, value: minValue,
                        slide: function(event, ui) {
                            $(".filterNumeric .gteValue").text(theOperLabel + " >= " + ui.value);
                        }
                    });
                    //LTE SLIDER
                    $(".filterNumeric .lteSlider").slider({
                        range: "max", min: minValue, max: maxValue, value: maxValue,
                        slide: function(event, ui) {
                            $(".filterNumeric .lteValue").text(theOperLabel + " <= " + ui.value);
                        }
                    });
                    //DEFAULT LABELLING
                    $(".filterNumeric .rangeValue").text(theOperLabel + " between " + $(".rangeSlider").slider("values",0) + " - " + $(".rangeSlider").slider("values",1));
                    $(".filterNumeric .gteValue").text(theOperLabel + " >= " + $(".gteSlider").slider("value"));
                    $(".filterNumeric .lteValue").text(theOperLabel + " <= " + $(".lteSlider").slider("value"));
                    //EVENTS
                    $('.filterNumeric li.special a[data-toggle="tab"]').unbind('shown.bs.tab');
                    $('.filterNumeric li.special a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
                        //var target = $(e.target).attr("href") // activated tab
                        $('.filterNumeric #tabSpecial .numericCheckBoxes').html('');
                        var result = window.result;
                        for(var i=0;i<result.length;i++) {
                            $('.filterNumeric #tabSpecial .numericCheckBoxes').append('<div><label><input type="checkbox">' + result[i][0] +  '</label></div>');
                        }
                    });

                    $(".filterNumeric .applyButton").unbind('click');
                    $(".filterNumeric .applyButton").click(function() {
                        //if ($('#filter' + theField).length>=1) return;
                        $('#filter' + theField).remove() //remove old filter button
                        $("#panelBodyFilters").append("<button id='filter" + theField + "' class='filter-button btn btn-xs btn-default " + theType + "'>" + theField + "<span class='glyphicon glyphicon-filter'></span></button>");
                        $(".filterNumeric").modal('hide');
                        
                        filter.numOper = oper;
                        if ($(".filterNumeric li.range").hasClass("active")) {
                            filter.numMatcher = "range";
                            filter.numIncludeNull = $(".filterNumeric #tabRange input[type='checkbox']").prop("checked");
                            filter.numValues[0] =  $(".rangeSlider").slider("values",0);
                            filter.numValues[1] =  $(".rangeSlider").slider("values",1);
                        }
                        else if ($(".filterNumeric li.gte").hasClass("active")) {
                            filter.numMatcher = "gte";
                            filter.numIncludeNull = $(".filterNumeric #tabGTE input[type='checkbox']").prop("checked");
                            filter.numValues[0] =  $(".gteSlider").slider("value");
                        }
                        else if ($(".filterNumeric li.lte").hasClass("active")) {
                            filter.numMatcher = "lte";
                            filter.numIncludeNull = $(".filterNumeric #tabLTE input[type='checkbox']").prop("checked");
                            filter.numValues[0] =  $(".lteSlider").slider("value");
                        }
                        else if ($(".filterNumeric li.special").hasClass("active")) {
                            filter.numMatcher = "special";
                            filter.numValues = [];
                            $(".filterNumeric .numericCheckBoxes input[type='checkbox']").each(function() {
                                if ($(this).prop('checked')) {
                                    var val = Number($(this).parent().text());
                                    filter.numValues.push(val);
                                    filter.numSpecialExclude = $(".filterNumeric #specialExclude").prop("checked");
                                }
                            });
                        }
                        drawTheChart();
                    });
                    $(".filterNumeric .clearButton").unbind('click');
                    $(".filterNumeric .clearButton").click(function() {
                        $('#filter' + theField).remove(); //remove old filter buttons
                        if (!filters.hasOwnProperty(theField)) return;
                        delete filters[theField];
                        drawTheChart();
                    });
                    //SHOW 
                    //TODO: Evaluate if deafult tab is needed or not.
                    $(".filterNumeric li.range a").tab('show');
                    $(".filterNumeric").modal('show');
                },
                error: function(data){
                    alert("Error occured");
                }
            });
        });
    }
    else if (theType == "date") {
        //SHOW DATE-FILTER-TYPE DIALOG FIRST
        $(".filterDateType").modal('show');
        $(".filterDateType .filterType").unbind("click");
        $(".filterDateType .filterType").click(function(){
            $(".filterDateType").modal('hide');
            //SET FILTER TYPE
            var clickLater = []; //array of controls to be clicked later
            var oper  = $(this).text().toLowerCase();
            if (oper.indexOf("remove filter")>-1) {
                $('#filter' + theField).remove(); //remove old filter buttons
                delete filters[theField];
                drawTheChart();
                return;
            }
            else if (oper.indexOf("relative date")>-1) {
                $(".filterDate .nav-tabs li.relative a").tab('show');
            }
            else if (oper.indexOf("# years")>-1) {
                $(".filterDate .nav-tabs li.relative a").tab('show');
                clickLater.push(".filterDate .tabrelative .years-button");
            }
            else if (oper.indexOf("# quarters")>-1) {
                $(".filterDate .nav-tabs li.relative a").tab('show');
                clickLater.push(".filterDate .tabrelative .quarters-button");
            }
            else if (oper.indexOf("# months")>-1) {
                $(".filterDate .nav-tabs li.relative a").tab('show');
                clickLater.push(".filterDate .tabrelative .months-button");
            }
            else if (oper.indexOf("range of dates")>-1){
                $(".filterDate .nav-tabs li.range a").tab('show');
            }
            //UI INIT
            $(".filterDate #fromdate").datepicker();
            $(".filterDate #todate").datepicker();
            $(".filterDate #gtedate").datepicker();
            $(".filterDate #ltedate").datepicker();
            //EVENTS
            $(".filterDate .clearButton").unbind('click');
            $(".filterDate .clearButton").click(function(){
                $('#filter' + theField).remove(); //remove old filter buttons
                delete filters[theField];
                drawTheChart();
            });
                
            $(".filterDate .applyButton").unbind('click');
            $(".filterDate .applyButton").click(function(){
                //VALIDATION, ETC.
                if ($(".filterDate li.relative").hasClass("active")) {
                    filter.dateMatcher = "relative";
                    filter.dateRelativeType = $(".filterDate #lblNextn").text().toLowerCase();
                    var t = $(".filterDate input[name='relValue']:checked").val();
                    if (t == 'current') {
                        filter.dateValues[0] = 0;
                    }
                    else if (t == 'previous') {
                        filter.dateValues[0] = -1;
                    }
                    else if (t == 'next') {
                        filter.dateValues[0] = 1;
                    }
                    else if (t == 'lastn') {
                        filter.dateValues[0] = -1 * Number($("#txtLastn" ).val());
                    }
                    else if (t == 'nextn') {
                        filter.dateValues[0] = Number($("#txtNextn" ).val());
                    }
                }
                else if ($(".filterDate li.range").hasClass("active")) {
                    var fdate = $(".filterDate #fromdate").val();
                    var tdate = $(".filterDate #todate").val();
                    if (checkDate(fdate).length>0) {
                        bspopup("Invalid From Date");
                        return;
                    }
                    else if (checkDate(tdate).length>0) {
                        bspopup("Invalid To Date");
                        return;
                    }
                    filter.dateMatcher = "range";
                    filter.dateValues[0] = fdate;
                    filter.dateValues[1] = tdate;
                }
                else if ($(".filterDate li.gte").hasClass("active")) {
                    var fdate = $(".filterDate #gtedate").val();
                    if (checkDate(fdate).length>0) {
                        bspopup("Invalid Date");
                        return;
                    }
                    filter.dateMatcher = "gte";
                    filter.dateValues[0] = fdate;
                }
                else if ($(".filterDate li.lte").hasClass("active")) {
                    var fdate = $(".filterDate #ltedate").val();
                    if (checkDate(fdate).length>0) {
                        bspopup("Invalid Date");
                        return;
                    }
                    filter.dateMatcher = "lte";
                    filter.dateValues[0] = fdate;
                }
                filter.dateIncludeNull = $(".filterDate .tab" + filter.dateMatcher + " .includeNull").prop('checked');
                $('#filter' + theField).remove() //remove old filter button
                $("#panelBodyFilters").append("<button id='filter" + theField + "' class='filter-button btn btn-xs btn-default " + theType + "'>" + theField + "<span class='glyphicon glyphicon-filter'></span></button>");
                $(".filterDate").modal('hide');
                drawTheChart();
            });
            
            $(".filterDate .dateButton").unbind('click');
            $(".filterDate .dateButton").click(function(){
                var theText = $(this).text();
                $(".filterDate #lblLastn").text(theText);
                $(".filterDate #lblNextn").text(theText);
                if (theText == "Days") {
                    $(".filterDate #lblCurrent").text("Today");
                    $(".filterDate #lblNext").text("Tomorrow");
                    $(".filterDate #lblPrevious").text("Yesterday");
                }
                else {
                    $(".filterDate #lblCurrent").text("Current " + theText.slice(0, -1));
                    $(".filterDate #lblNext").text("Next " + theText.slice(0, -1));
                    $(".filterDate #lblPrevious").text("Previous " + theText.slice(0, -1));
                }
            });
            
            $(".filterDate input[name='relValue']").unbind('click'); //radio buttons
            $(".filterDate input[name='relValue']").click(function(){
                var theVal = $(this).val();
                $("#tabDateRelative input[type='number']").attr("disabled", "");
                if (theVal == "lastn" || theVal == "nextn") {
                    $(this).parent().find("input[type='number']").attr("disabled", null);
                    if ($(this).parent().find("input[type='number']").val() == ""){
                        $(this).parent().find("input[type='number']").val("1");
                    }
                }
            });
            //SET DEFAULT VALUES
            $(".filterDate #lblLastn").text("Days");
            $(".filterDate #lblNextn").text("Days");
            $(".filterDate #lblPrevious").text("Yesterday");
            $(".filterDate #lblNext").text("Tomorrow");
            $(".filterDate #lblCurrent").text("Today");
            //PENDING ACTIONS
            for(var i=0;i<clickLater.length;i++) {
                $(clickLater[i]).click();
            }
            //SHOW
            $(".filterDate").modal('show');
        });
    }
}

function allowDrop(ev) {
    ev.preventDefault();
}

function doConnect() {
    if ($("#connectDialog .refresh").hasClass("spinning")) {
        return;
    }
    
    conn = {
		Type: $("[name='txtConnType']:checked").val(),
        Server: $("#txtServer").val(),
        Port: $("#txtPort").val(),
        Database: $("#txtDatabase").val(),
        Username: $("#txtUsername").val(),
        Password: $("#txtPassword").val()
    };
    localStorage.setItem("conn", JSON.stringify(conn));
    connect();
}


function connect() {
    $("#connectDialog .refresh").addClass("spinning");
    $.ajax({
        url: "app.php",
        type: "POST",
        data: conn ,
        error: function(response) {
            $("#connectDialog .refresh").removeClass("spinning");
            $("#connectDialog").modal('hide');
        },
        success: function(data) {
			//console.log('success', data);
            $("#connectDialog .refresh").removeClass("spinning");
            $("#connectDialog").modal('hide');
            if (data.indexOf("Error occurred") >= 0) {
                bspopup({
                    text: data,
                    button2: "Retry",
                    success: function(ev) {
                        if (ev.button == 'button2') showConnectDialog();
                    }});
                return;
            }
            showTablesDialog(data);
        },
        complete: function() {
            $("#connectDialog .refresh").removeClass("spinning");
        }
    });
}

function showConnectDialog() {
    if (conn.hasOwnProperty('Server')) {
        $("#connectDialog #txtServer").val(conn.Server);
        $("#connectDialog #txtPort").val(conn.Port);
        $("#connectDialog #txtDatabase").val(conn.Database);
        $("#connectDialog #txtUsername").val(conn.Username);
        $("#connectDialog #txtPassword").val(conn.Password);
    }
    $("#connectDialog").modal('show');
}

function showSQLDialog() {
    $("#txtSQL").val(lastSQL);
    $("#sqlDialog").modal('show');
}

function refreshTablesDialog() {
	//$("#selectTableDialog").modal('hide');
	connect();
}

function showTablesDialog(data) {
    data = JSON.parse(data);
    var tbody = "";
    var schemas = [];
	for (var i=0;i<data.length;i++) {
		var row = data[i];
		var tname = row["table_schema"];
		if (schemas.indexOf(tname) ==-1 ) {
			schemas.push(tname);
			tbody += "<option value='" + tname + "'>" + tname +  "</option><br>";
		}
	}
    $("#selectTableDialog #ddnschema").html(tbody);
    
    $("#selectTableDialog #ddnschema").unbind('change');
    $("#selectTableDialog #ddnschema").change(function(){
		//$("ddnschema").find("input[type='radio']").length
		divBody = "<div class='input-group'>";
		schema = $(this).val();
		
		for (var i=0;i<data.length;i++) {
			var row = data[i];
			var tname = row["table_schema"] + "."  + row["table_name"];
			if (divBody.indexOf(tname) ==-1 ) {
				if (tname.indexOf(schema + ".") == 0) divBody += "<label class='btn btn-xs btn-default'><input name='grpSelectTable' type='radio' value='" + tname + "' id='"  + tname +  "' " + ((i==0) ? "checked" : "") + ">&nbsp;" + tname + "</label><br>";
			}
		}
		
		divBody += "</div>";
		$("#selectTableDialog #tabTables").html(divBody);
		$("#selectTableDialog #tabTables input[type='radio']:first").prop("checked",true);
	});
	
    $("#selectTableDialog #ddnschema option:first").trigger('change');
    //$("#selectTableDialog #ddnschema option:first").prop("selected",true);
    $("#selectTableDialog .modal-body .tab-content").animate({scrollTop: 0});
    $("#selectTableDialog .selectTableButton").unbind("click");
    $("#selectTableDialog .selectTableButton").click(function() {
        doSelectTable();
    });
    if ($("#selectTableDialog").hasClass('in')) {
		console.log('already shown');
	}
	else {
		console.log('not already shown');
		$("#selectTableDialog").modal('show');
	}
	
    window.data = data;
}

function doTestCustomSQL(options) {
    if (options == undefined) options = {};
    if (options.silent == undefined) options.silent = false;
    if (options.sql == undefined) options.sql = $("#txtCustomSQL").val();
    var data = $.extend({}, conn);
    data.SQL = options.sql;
    console.log("SQL", data.SQL);
    $.ajax({
        url: "app.php",
        method: "POST",
        data: data,
        success: function(data){
            if (data.indexOf("Error code:") == -1) {
                if (!options.silent) {
                    result = JSON.parse(data);
                    bspopup({text: result.length + " records returned"});
                    window.result = result;
                }
                if (options.success != undefined) options.success(data);
            } else {
                if (!options.silent) {
                    bspopup({text: data});
                }
                if (options.error != undefined) options.error(data);
            }
        }
    });
}

function doSelectTable() {
    if ($("#tabCustomSQL").hasClass("active")) {
        var newdata = [];
        /**
         * TODO:
         * 1. Test Custom SQL and make sure it does not return an error. 
         * 2. Create a list from the resultset of CustomSQL last executed like this:
         * { table_schema: "performance_schema", table_name: "CustomSQL", column_name: "NAME", data_type: "varchar" }
         * 
         * 3. Assign this list to newdata variable.
         * */
        var data = doTestCustomSQL({
            silent: true,
            error: function() {
                bspopup({text: "Error occurred. Please check SQL statement."});
            },
            success: function(data) {
                var result = JSON.parse(data);
                if (result.length==0) {
                    bspopup({text: "Zero rows returned."});
                    return;
                }
                for (var key in result[0]) {
                    console.log("key", key);
                    if (!$.isNumeric(key)) {
                        var val = result[0][key];
                        var theType = "";
                        if ($.isNumeric(val)) {
                            theType = "int";
                        }
                        else {
                            theType = "varchar";
                        }
                        var obj = { table_schema: "performance_schema", table_name: "CustomSQL", column_name: key, data_type: theType };
                        newdata.push(obj);
                    }
                }
                
                $("#selectTableDialog").modal('hide');
                buildTheTables({
                    data: newdata
                });
            }
        });
    } else {
		if ($("[name='grpSelectTable']:checked").length == 0) {
			bspopup("Zero tables selected.");
			return;
		}
        $("#selectTableDialog").modal('hide');
        var currTable = $("[name='grpSelectTable']:checked").val();
        var data = window.data;
        var newdata = [];
        for (var i=0;i<data.length;i++) {
            var row = data[i];
            var tname = row["table_schema"] + "."  + row["table_name"];
            if (tname == currTable) {
                newdata.push(row);
            }
        }
        buildTheTables({
            data: newdata
        });
    }
}

/*
 * Builds the visual interface needed to show the chart
 * 
 * @param data list of rows containing table-data returned from mysql information_schema
 * */
function buildTheTables(options) {
    var data = options.data;
    var divtables = "<div>";
    tables = {};
    
    //data = JSON.parse(data);
    for (var i=0;i<data.length;i++) {
        var row = data[i];
        var theTable = row.table_schema + "." + row.table_name;
        if (!(theTable in tables)) {
            tables[theTable] = {};
            var types = ['default'];
            var rand = Math.floor(Math.random() * types.length);
            divtables += '<button id=table' + row.table_name +  ' title=' + row.table_name +  ' class="btn btn-xs btn-' + types[rand] +  ' table-button">' +  row.table_name + '</button>';
            tables[theTable]['schema'] = row.table_schema;
            tables[theTable]['dimensions'] = [];
            tables[theTable]['measures'] = [];
            tables[theTable]['fields'] = {};
        }
        var theField = new Field(row.column_name, row.data_type);
        tables[theTable]['fields'][row.column_name] = theField;
        if (numTypes.indexOf(row.data_type) > -1) {
            tables[theTable]['measures'].push(theField);
        }
        else {
            tables[theTable]['dimensions'].push(theField);
        }
    }
    
    divtables += "</div>";
    $("#panelTables .panel-body").html(divtables)
    window.tables = tables;
    buildTable(theTable); //just build the latest table from the collection.
    clearChart();
}

function buildTable(tname) {
    currentTable = tname;
    currentDimensions = [];
    currentMeasures = [];
    //generate html for dimensions and measures
    var divdimensions = "";
    var divmeasures = "";
    for(var i=0;i<tables[tname].measures.length;i++) {
        divmeasures += '<label id="' + tables[tname].measures[i].name +  '" draggable="true" ondragstart="drag(event)"  class="btn  btn-xs btn-default text-default measure">' + tables[tname].measures[i].name + '</label>';
    }
    for(var i=0;i<tables[tname].dimensions.length;i++) {
        divdimensions += '<label id="' + tables[tname].dimensions[i].name +  '"  draggable="true" ondragstart="drag(event)" class="btn btn-xs btn-default dimension">' + tables[tname].dimensions[i].name + '</label>';
    }
    //special measure called "Count All"
	divmeasures += '<label id="_count_all" draggable="true" ondragstart="drag(event)"  class="btn  btn-xs btn-default text-default measure">Count All</label>';
    divdimensions += "";
    divmeasures += "";
    $("#panelDimensions .panel-body").html(divdimensions);
    $("#panelMeasures .panel-body").html(divmeasures);

    $("#panelColumns .panel-body").html(getHTMLTeaser());
    $("#panelRows .panel-body").html(getHTMLTeaser());

    //Resest Filters
    filters = {};
    $("#panelFilters .panel-body").html("");
}

/*
 * Prepares chart drawing functionality by pulling data using SQL and
 * using the available measures and dimensions in the row and column boxes.
 * 
 * */
function drawTheChart() {
    lastSQL = "";
    currentDimensions=[];
    currentMeasures=[];
    $("#panelBodyColumns #label, #panelBodyRows #label").each(function() {
        if ($(this).text().indexOf("(") > -1) {
            currentMeasures.push($(this).text());
        }
        else {
            currentDimensions.push($(this).text());
        }
    })
    .promise().done(function() {
        if (currentDimensions.length==0 || currentMeasures.length==0) {
            clearChart();
            return;
        }
        //lets build sql now.
        var sql = "";
        var selClause = "";
        var groupbyClause = "";
        for (var i=0;i<currentMeasures.length;i++) {
			if (currentMeasures[i].indexOf("(Count All)")>-1) {
				selClause += (selClause.length==0 ? "" : ",") +   "count(*)";
			}
			else {
				selClause += (selClause.length==0 ? "" : ",") +   currentMeasures[i];
			}
            if (conn.Type == 'pgsql' || conn.Type == 'redshift') selClause += ' "' + currentMeasures[i] +  '"';
        }
        for (var i=0;i<currentDimensions.length;i++) {
            selClause += (selClause.length==0 ? "" : ",")  +  currentDimensions[i] ;
            groupbyClause += (groupbyClause.length==0 ? "" : ",")  +  currentDimensions[i] ;
        }
        console.log("currentTable", currentTable);
        if (currentTable=="performance_schema.CustomSQL") {
            sql = "SELECT " + selClause + " FROM (" + $("#txtCustomSQL").val().replace(";","") + ") foo GROUP BY " + groupbyClause;
        }
        else {
            sql = "SELECT " + selClause + " FROM " + currentTable + " " + processFiltersWhere() + " GROUP BY "
                + groupbyClause + processFiltersHaving();
        }
        console.log("processed sql: ", sql);
        $("#panelChart .refresh-button").removeClass("hidden");
        $("#panelChart .glyphicon-refresh").addClass("spinning");
        var tdata = $.extend({}, conn);
        tdata.SQL = sql;
        $.ajax({
            url: "app.php",
            type: "POST",
            data: tdata,
            success: function(data) {
				console.log("drawTheChart().success", data);
				if (pauseChartingFlag) {
					pauseChartingFlag = false;
					return;
				}
                lastSQL = sql;
				$("#panelChart .refresh-button").addClass("hidden");
				$("#panelChart .glyphicon-refresh").removeClass("spinning");
                var categories = []; //data regarding the current dimension
                var series = []; //data regarding the current measures
                for(var j=0;j<currentMeasures.length;j++) {
                    series.push({name: currentMeasures[j],data:[]});
                }
                data = JSON.parse(data);
                for(var i=0;i<data.length;i++) {
                    //categories.push(data[i][0]);
                    for(var j=0;j<currentDimensions.length;j++) {
                        categories.push(data[i][currentDimensions[j]]);
                    }
                    for(var j=0;j<currentMeasures.length;j++) {
                        //var val = Number(data[i][j+1]);
                        var val = Number(data[i][currentMeasures[j]]);
                        series[j].data.push(val);
                    }
                }
                lastChartData = {
                    series: series,
                    categories: categories
                };
                drawChart(categories, series);
            },
            error: function(response) {
				console.log("drawTheChart().error", response);
				$("#panelChart .refresh-button").addClass("hidden");
				$("#panelChart .glyphicon-refresh").removeClass("spinning");
            }
            });        
    });
}

function pauseCharting() {
	$("#panelChart .refresh-button").addClass("hidden");
	$("#panelChart .glyphicon-refresh").removeClass("spinning");
	pauseChartingFlag=true;
}

/**
 * Process and return the having clause of filters.
 */
function processFiltersHaving() {
    sql = "";
    for(key in filters) {
        var filter = filters[key];
        if (filter.type=="number" && filter.numOper != "all") { //other opers will go in having clause
            sql += (sql.length==0?" having (":" and (" ) + filter.numOper
                + "(" + (filter.numIsDistinct?" distinct ":"")  + filter.name + ")";
            if (filter.numMatcher == "range") {
                sql += " between " + filter.numValues[0] + " and " + filter.numValues[1];
            }
            else if (filter.numMatcher == "gte") {
                sql += " >= " + filter.numValues[0];
            }
            else if (filter.numMatcher == "lte") {
                sql += " <= " + filter.numValues[0];
            }
            if (filter.numIncludeNull) {
                sql += " or " + filter.numOper + "(" + (filter.numIsDistinct?" distinct ":"")
                    + filter.name +  ") is null";
            }
            sql += ")";
        }
    }
    console.log("processed having filters: ", sql);
    return sql;
}

/**
 * Process and return the where clause of filters.
 */
function processFiltersWhere() {
    sql = "";
    for(key in filters) {
        var filter = filters[key];
        if (filter.type=='string') {
            sql += (sql.length==0?" where (":" and (" ) + filter.name;
            if (filter.stringMatcher=='general') {
                var vals = "(";
                for(var j=0;j<filter.stringGeneral.length;j++) {
                    vals += (vals.length==1?"'":",'") + filter.stringGeneral[j].replace(/'/g,"\\'") + "'";
                }
                vals += ")";
                //TODO: make a proper fix for the below mess.
                if (vals=="()") vals="('foobar1234567890')"; //No value selected, avoid sql error by selecting a dummy value.
                sql += (filter.stringGeneralExclude ? " not in " : " in ") + vals;
            }
            else if (filter.stringMatcher=='wildcard') {
                if (filter.stringWcIncludeAll == false && filter.stringWcValue.length==0) {
                    sql += " = ''";
                }
                else {
                    if (filter.stringWcType == "contains") {
                        sql += (filter.stringWcExclude ? " not like " : " like ") + "'%" + filter.stringWcValue + "%'";
                    }
                    else if  (filter.stringWcType == "startswith") {
                        sql += (filter.stringWcExclude ? " not like " : " like ") + "'" + filter.stringWcValue + "%'";
                    }
                    else if  (filter.stringWcType == "endswith") {
                        sql += (filter.stringWcExclude ? " not like " : " like ") + "'%" + filter.stringWcValue + "'";
                    }
                    else if  (filter.stringWcType == "equals") {
                        sql += (filter.stringWcExclude ? " not like " : " like ") + "'" + filter.stringWcValue + "'";
                    }
                }
            }
            //TODO: Evaluate whether stringIncludeNull is needed or not.
            //~ if (filter.stringIncludeNull) {
                //~ sql += " or " + filter.name + " is null";
            //~ }
            sql += ")";
        }
        else if (filter.type == "number" && filter.numOper == "all") { //other opers will go in having clause
            sql += (sql.length==0?" where (":" and (") + filter.name;
            if (filter.numMatcher == "range") {
                sql += " between " + filter.numValues[0] + " and " + filter.numValues[1];
            }
            else if (filter.numMatcher == "gte") {
                sql += " >= " + filter.numValues[0];
            }
            else if (filter.numMatcher == "lte") {
                sql += " <= " + filter.numValues[0];
            }
            if (filter.numIncludeNull) {
                sql += " or " + filter.name + " is null";
            }
            sql += ")";
        }
        else if (filter.type == "date") {
            sql += (sql.length==0?" where (":" and (") + filter.name;
            if (filter.dateMatcher == "relative") {
                var reltype = filter.dateRelativeType.slice(0,-1);
                if (filter.dateValues[0] < 0) { //past date
                    sql += " between date_add(curdate(), interval " + filter.dateValues[0] +  " " + filter.dateRelativeType.slice(0,-1) + ") and curdate()";
                }
                else if (filter.dateValues[0] > 0) { //future date
                    sql += " between curdate() and date_add(curdate(), interval " + filter.dateValues[0] +  " " + reltype + ")";
                }
                else { //current day/month/year/etc.
                    sql += " like '%' and " + reltype + "(" + filter.name + ") = " + reltype +  "(curdate())";
                }
            }
            if (filter.dateMatcher == "range") {
                sql += " between '" + filter.dateValues[0] + "' and '" + filter.dateValues[1] + "'";
            }
            else if (filter.dateMatcher == "gte") {
                sql += " >= '" + filter.dateValues[0] + "'";
            }
            else if (filter.dateMatcher == "lte") {
                sql += " <= '" + filter.dateValues[0] + "'";
            }
            if (filter.dateIncludeNull) {
                sql += " or " + filter.name + " is null";
            }
            sql += ")";
        }
    }
    console.log("processed where filters: ", sql);
    return sql;
}

/*
 * Draws the actual chart based on given categories and series
 * 
 * @param categories highchart option
 * @param series highchart option
 * */
function drawChart(categories, series) {
    var options = {};
    options.chart = {type: currentChartType};
    options.title = {text: ""};
    options.xAxis = {categories: categories};
    options.yAxis = {title: {
                text: 'Units'
            }};
    options.series = series;
    $('#theChart').highcharts(options);
};

function clearEnv() {
    $("#panelBodyColumns").html("");
    $("#panelBodyColumns").append(getHTMLTeaser());
    $("#panelBodyRows").html("");
    $("#panelBodyRows").append(getHTMLTeaser());
    clearChart();
}

function fetchEnvs() {
    $("#ddnrestore .dropdown-menu li").remove();
    $.ajax({
        url: "app.php",
        method: "POST",
        data: {FETCH_ENVS: ""},
        success: function(data) {
            var theList = JSON.parse(data);
            lastEnvList = theList;
            for(var i=0;i<theList.length;i++) {
                $("#ddnrestore .dropdown-menu").append("<li><a href='#'>" + theList[i]  + "</a></li>");
            }
        }
    });
}

function fetchDashes() {
    $("#ddndash .dropdown-menu li").remove();
    var data = {FETCH_DASHES: ""};
    var tag = getQueryString("tag");
    if (tag != null) {
		data['USER_TAG'] = tag;
	}
    $.ajax({
        url: "app.php",
        method: "POST",
        data: data,
        success: function(data) {
            var theList = JSON.parse(data);
            lastEnvList = theList;
            for(var i=0;i<theList.length;i++) {
                $("#ddndash .dropdown-menu").append("<li><a href='#'>" + theList[i]  + "</a></li>");
            }
			$("#ddndash .dropdown-menu").append("<li><a href='#'>New Dash</a></li>");
        }
    });
}

function saveEnv() {
	console.log("saveEnv()");
	bspopup({
		type: "input",
		text: "Enter a filename: ",
		success: function(ev) {
			var fileName = ev.value;
			if (fileName==null || fileName.length==0) return;
			var env = saveEnvToJSON();
			$.ajax({ 
				url: "app.php",
				method: "POST",
				data: {SAVE_ENV: env, FILE: fileName},
				success: function(data) {
					fetchEnvs();
					bspopup("Chart data is saved.");
				}
			});
		}
	});
}

function saveEnvToJSON() {
	var obj = {};
	obj.chartData = lastChartData;
	obj.measures = $("#panelBodyMeasures").html();
	obj.dimensions = $("#panelBodyDimensions").html();
	obj.rows = $("#panelBodyRows").html();
	obj.columns = $("#panelBodyColumns").html();
	obj.tables = $("#panelTables .panel-body").html();
	obj.vars = {};
	obj.vars.tables = tables;
	obj.vars.currentTable = currentTable;
	obj.vars.currentDimensions = currentDimensions;
	obj.vars.filters = filters;
	obj.vars.currentMeasures = currentMeasures;
	obj.vars.lastSQL = lastSQL;
	return JSON.stringify(obj);
}

function saveDash() {
    bspopup({
        type: "input",
        text: "Enter a filename: ",
        success: function(ev) {
            var fileName = ev.value;
            if (fileName==null || fileName.length==0) return;
            console.log("saveDash()");
            var obj = {};
            obj.files = chartfiles;
            var dash = JSON.stringify(obj);
            var data = {SAVE_DASH: dash, FILE: fileName};
            if (getQueryString("tag")!=null) {
				data.USER_TAG = getQueryString("tag");
			}
            $.ajax({ 
                url: "app.php",
                method: "POST",
                data: data,
                success: function(data) {
					fetchDashes();
                    bspopup("Dash is saved!");
                }
            });
        }
    });
}


function restoreEnv(fileName, callback) {
    $.ajax({
        url: "app.php",
        type: "POST",
        data: {GET_ENV: fileName},
        success: function(data) {
            if (data == "FILE_NOT_FOUND") {
                bspopup(data);
                if (callback != undefined) callback(data);
                return;
            }
            restoreEnvFromJSON(data, callback);
        }
    });
}

function restoreEnvFromJSON(data, callback) {
	var obj = JSON.parse(data);
	lastChartData = obj.chartData;
	$("#panelBodyMeasures").html(obj.measures);
	$("#panelBodyDimensions").html(obj.dimensions);
	$("#panelBodyRows").html(obj.rows);
	$("#panelBodyColumns").html(obj.columns);
	$("#panelTables .panel-body").html(obj.tables);
	if (obj.vars != undefined) {
		currentMeasures =  obj.currentMeasures;
		currentDimensions = obj.currentDimensions;
		lastSQL=obj.lastSQL;
		filters=obj.filters;
		tables=obj.tables;
	}
	drawChart(lastChartData.categories, lastChartData.series);
	if (callback != undefined) callback(data);
}

function clearChart() {
    $('#theChart').highcharts({
    chart: {
        type: 'line',//'bar'
    },
    title: {
        text: ''
    },
    xAxis: {
        categories: ['dummy-dimension-val1','dummy-dimension-val2','dummy-dimension-val3']
    },
    yAxis: {
        title: {
            text: ''
        }
    },
    series: []
});
}
