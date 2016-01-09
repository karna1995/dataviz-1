/**
 * JavaScript module for the Dataviz app.
 * 
 * @author: Prahlad Yeri  (prahladyeri@yahoo.com)
 * */

var conn = {}; //connection information
var tables = {}; //currently selected data sources
var currentTable = ""; //currently selected table for SQL "from" clause
var currentDimensions = []; //OBSOLETE: currently selected columns for SQL "group by" clause
var currentMeasures = []; //OBSOLETE: currently selected columns for SQL "select" clause (sum/avg/etc.)
var currentChartType = 'line';
var columns = [];
var rows = [];
var lastSQL = ""; //last successfully executed sql statement
var lastChartData = {}; //last successful data used to draw the chart
var lastEnvList = [];
var filters = {}; //dict for all filters name:Filter.
var numTypes = ["float", "double", "decimal", "int", "smallint",
    "tinyint", "mediumint", "bigint"];
var env = "";

function init()
{
    $.get("js/modals.dat", function(data){
        $('body').append(data);
        return;
    });
    
    clearChart();
    fetchEnvs();
    conn = localStorage.getItem("conn");
    if (conn==null) {
        conn={};
        showConnectDialog();
    } else {
        conn = JSON.parse(conn);
        connect();
    }
    handlers();
}

function handlers() {
    $("body").on("click", "#ddnrestore .dropdown-menu li a", function() {
        restoreEnv($(this).text());
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
   $.ajax({
        url: "app.php",
        type: "POST",
        data: {
            Server:conn.Server,
            Port:conn.Port,
            Database:conn.Database,
            Username:conn.Username,
            Password:conn.Password,
            SQL:lastSQL,
            CSV:"true"
            },
        success: function(data) {
            //nothing to do
            console.log(data);
            if (data=="success") window.location = "output.csv"
        },
        error: function(response) {
            //handle error
            console.log(response);
        }
        });
}

function getHTMLTeaser() {
    return '<SMALL id="teaser">DROP HERE</SMALL>';
}

function drag(ev) {
    console.log(".drag()",ev.target.id);
    ev.dataTransfer.setData("text", ev.target.id);
}

function drop(ev) {
    console.log("drop()");
    ev.preventDefault();
    var data = ev.dataTransfer.getData("text");
    console.log(".drop() data, target.id: ", data, ev.target.id);
    var control = $("#" + data);
    if (control.hasClass('measure') || control.hasClass('dimension')) {
        //One of the measure/dimension buttons on the bottom left
        if ( $(ev.target).attr("id")=="panelBodyFilters" || $(ev.target).parent().attr("id") == "panelBodyFilters" 
            && (control.hasClass("measure") || control.hasClass("dimension")) ) {
            //measure dragged into dimension
            //control.appendTo($(theParent));
            var theType = "";
            var theField = control.text();
            if (control.hasClass("measure")) {
                theType = "number";
            }
            else { //TODO: Handle Date datatype here.
                theType = "string";
            }
            var filter = new Filter(theField, theType);
            filters[theField] = filter;
            //add a filter control
            $("#panelBodyFilters").append("<button id='filter" + theField + "' class='btn btn-xs btn-default " + theType + "'>"
             + theField + "<span class='glyphicon glyphicon-filter'></span></button>");
            if (theType=="string") {
                //
            }
            else if (theType=="number") {
                $(".filterNumeric").modal('show');
                $(".filterNumeric .rangeSlider").slider({
                    range: true,
                    min: 0,
                    max: 10000,
                    values: [10,500],
                    slide: function(event, ui) {
                        $(".filterNumeric .rangeValue").text(ui.values[0] + " - " + ui.values[1]);
                    }
                });
                var theText = $(".rangeSlider").slider("values",0) + " - " + $(".rangeSlider").slider("values",1);
                $(".filterNumeric .rangeValue").text(theText);
                //$(".filterNumeric #txtRange").slider({});
            }
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
    console.log(".drop(). The target is: ", theParent.id);
    if (theParent.id=='panelBodyRows') {
        //this is dragged inside rows
    } else if (theParent.id=='panelBodyColumns') {
        //this is dragged inside cols
    }
    var theText = control.text();
    
    //theParent.appendChild(document.getElementById(data));
    
    //var theLabel = document.createElement("label");
    var theField = $("#genericMenu").clone().removeClass("hidden")
        .attr("id", "genericMenu" + theText)
        .attr("field", theText);
    
    //$(theLabel).addClass('btn btn-xs btn-success');
    if (control.hasClass("measure")) {
        theField.addClass("measure");
        theField.find("#label").text("COUNT(" + control.text() + ")")
            .removeClass("btn-info")
            .addClass("btn-success");
    } else if (control.hasClass("dimension")) {
        theField.addClass("dimension");
        theField.find("#label").text(control.text());
    }
    theField.find("#label").append('<span class="caret"></span>');
    $(theParent).append(theField);
    $(theParent).find("#teaser").remove();
    
    currentMeasures = [];
    currentDimensions = [];
    drawTheChart();
}

function allowDrop(ev) {
    ev.preventDefault();
}

function doConnect() {
    if ($("#connectDialog .refresh").hasClass("spinning")) {
        bspopup("Connection in progress...");
        return;
    }
    
    console.log("doConnect()");
    conn = {
        Server: $("#txtServer").val(),
        Port: $("#txtPort").val(),
        Database: $("#txtDatabase").val(),
        Username: $("#txtUsername").val(),
        Password: $("#txtPassword").val(),
    };
    localStorage.setItem("conn", JSON.stringify(conn));
    connect();
}

function connect() {
    console.log("connect");
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
            $("#connectDialog .refresh").removeClass("spinning");
            $("#connectDialog").modal('hide');
            if (data.indexOf("Error occurred") >= 0) {
                bspopup({text: data});
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

function showTablesDialog(data) {
    //console.log(data);
    data = JSON.parse(data);
    divBody = "<div class='input-group'>";
    for (var i=0;i<data.length;i++) {
        var row = data[i];
        var tname = row["table_schema"] + "."  + row["table_name"];
        if (divBody.indexOf(tname) ==-1 ) {
            divBody += "<label class='btn btn-xs btn-default'><input name='grpSelectTable' type='radio' value='" + tname + "' id='"  + tname +  "' " + ((i==0) ? "checked" : "") + ">&nbsp;" + tname + "</label><br>";
        }
    }
    divBody += "</div>"; //class='input-group'>
    $("#selectTableDialog .modal-body #tabTables").html(divBody);
    $("#selectTableDialog").modal('show');
    window.data = data;
}

function doTestCustomSQL(options) {
    var data = $.extend({}, conn);
    if (options == undefined) options = {silent: false};
    data.SQL = $("#txtCustomSQL").val();
    console.log("SQL", data.SQL);
    $.ajax({
        url: "app.php",
        method: "POST",
        data: data,
        success: function(data){
            console.log(data);
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
                if (options.error != undefined) options.error();
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
                        console.log("key and val: ", result[0][key], val);
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
    //var divdimensions = "";
    //var divmeasures = "";
    tables = {};
    
    //data = JSON.parse(data);
    for (var i=0;i<data.length;i++) {
        var row = data[i];
        //console.log(row.table_name + "." + row.column_name);
        if (!(row.table_name in tables)) {
            tables[row.table_name] = {};
            //var types = ['primary', 'info', 'warning', 'success', 'danger'];
            var types = ['default'];
            var rand = Math.floor(Math.random() * types.length);
            divtables += '<button id=table' + row.table_name +  ' title=' + row.table_name +  ' class="btn btn-xs btn-' + types[rand] +  ' table-button">' +  row.table_name + '</button>';
            tables[row.table_name]['schema'] = row.table_schema;
            tables[row.table_name]['dimensions'] = [];
            tables[row.table_name]['measures'] = [];
        }
        if (numTypes.indexOf(row.data_type) > -1) {
            tables[row.table_name]['measures'].push(row.column_name);
        }
        else {
            //console.log('non number field found ', row.column_name, row.column_type);
            tables[row.table_name]['dimensions'].push(row.column_name);
        }
    }
    
    divtables += "</div>";
    $("#panelTables .panel-body").html(divtables)
    
    window.tables = tables;
    
    //attach events to .table-button
    $(".table-button").each(function(index, obj){
        $(this).on("click", {id: $(this).attr("id")}, function(event){
            var tname = event.data.id.substring(5);
            currentTable = tables[tname].schema + "." +  tname;
            currentDimensions = [];
            currentMeasures = [];
            console.log(".click ", event.data.id, tables[tname].measures);
            //generate html for dimensions and measures
            var divdimensions = "";
            var divmeasures = "";
            for(var i=0;i<tables[tname].measures.length;i++) {
                console.log("measure:",tables[tname].measures[i]);
                divmeasures += '<label id="' + tables[tname].measures[i] +  '" draggable="true" ondragstart="drag(event)"  class="btn btn-xs btn-default measure">' + tables[tname].measures[i] + '</label>';
            }
            if (tables[tname].dimensions.length >0) {
                //currentDimension = tables[tname].dimensions[0];
            }
            for(var i=0;i<tables[tname].dimensions.length;i++) {
                console.log("dimensions:",tables[tname].dimensions[i]);
                divdimensions += '<label id="' + tables[tname].dimensions[i] +  '"  draggable="true" ondragstart="drag(event)" class="btn btn-xs btn-default dimension">' + tables[tname].dimensions[i] + '</label>';
            }
            divdimensions += "";
            divmeasures += "";
            $("#panelDimensions .panel-body").html(divdimensions);
            $("#panelMeasures .panel-body").html(divmeasures);
            
            $("#panelColumns .panel-body").html(getHTMLTeaser());
            //~ $("#panelColumns .panel-title.columns label").each(function() {
                //~ $(this).remove();
            //~ });
            $("#panelRows .panel-body").html(getHTMLTeaser());
            
            $("button.dimension").on('click', function(){
                //currentDimension = $(this).text();
                //drawTheChart();
            });
            
            //~ $("#panelMeasures .measure input[type='checkbox']").click(function(){
                //~ //console.log($(this).attr("id"), $(this).is(":checked"));
                //~ var measure = $(this).attr("id");
                //~ if ($(this).is(":checked")) {
                    //~ currentMeasures.push(measure);
                //~ }
                //~ else {
                    //~ if (currentMeasures.indexOf(measure)>-1) {
                        //~ currentMeasures.remove(measure);
                    //~ }
                //~ }
                //~ if (currentMeasures.length>0) {
                    //~ drawTheChart();
                //~ }
                //~ else {
                    //~ clearChart();
                //~ }
            //~ });
        });
    });
    
    $(".table-button:first").click(); //lets auto click the first table in the box.
}

/*
 * Prepares chart drawing functionality by building SQL and
 * using the available measures and dimensions in the row and column boxes.
 * 
 * */
function drawTheChart() {
    //if (currentMeasures.length==0) return;
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
        console.log(currentDimensions.length, currentMeasures.length)
        if (currentDimensions.length==0 || currentMeasures.length==0) {
            clearChart();
            return;
        }
        //lets build sql now.
        var sql = "";
        var selClause = "";
        var groupbyClause = "";
        for (var i=0;i<currentMeasures.length;i++) {
            //selClause += (selClause.length==0 ? "" : ",") + "count(" +  currentMeasures[i] + ")";
            selClause += (selClause.length==0 ? "" : ",") +   currentMeasures[i];
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
            sql = "SELECT " + selClause + " FROM " + currentTable + " GROUP BY " + groupbyClause;
        }
        console.log(sql);
        $("#panelDimensions .glyphicon-refresh").addClass("spinning");
        $("#panelMeasures .glyphicon-refresh").addClass("spinning");
        $.ajax({
            url: "app.php",
            type: "POST",
            data: {
                Server:conn.Server,
                Port:conn.Port,
                Database:conn.Database,
                Username:conn.Username,
                Password:conn.Password,
                SQL:sql
                },
            success: function(data) {
                lastSQL = sql;
                $("#panelDimensions .glyphicon-refresh").removeClass("spinning");
                $("#panelMeasures .glyphicon-refresh").removeClass("spinning");
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
                //window.data = data;
                //window.series = series;
                //window.categories = categories;
                drawChart(categories, series);
            },
            error: function(response) {
                $("#panelDimensions .glyphicon-refresh").removeClass("spinning");
                $("#panelMeasures .glyphicon-refresh").removeClass("spinning");
                //handle error
            }
            });        
    });
}

/*
 * Draws the actual chart based on given categories and series
 * 
 * @param categories highchart option
 * @param series highchart option
 * */
function drawChart(categories, series) {
    var options = {};
    options.chart = {type: currentChartType}; //'bar'
    //options.title = {text: currentDimensions[0] + " wise chart"};
    options.title = {text: ""};
    options.xAxis = {categories: categories};
    options.yAxis = {title: {
                text: 'Units'
            }};
    options.series = series; //JSON.parse(series); //[{name: series[0].name, data: series[0]['data']}];
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
    console.log("fetching all envs.");
    $("#ddnrestore .dropdown-menu li").remove();
    $.ajax({
        url: "app.php",
        method: "POST",
        data: {FETCH_ENVS: ""},
        success: function(data) {
            console.log(data);
            var theList = JSON.parse(data);
            lastEnvList = theList;
            for(var i=0;i<theList.length;i++) {
                $("#ddnrestore .dropdown-menu").append("<li><a href='#'>" + theList[i]  + "</a></li>");
            }
        }
    });
}

function saveEnv() {
    bspopup({
        type: "input",
        text: "Enter a filename: ",
        success: function(ev) {
            var fileName = ev.value;
            if (fileName==null || fileName.length==0) return;
            console.log("saveEnv()");
            var obj = {};
            obj.chartData = lastChartData;
            obj.measures = $("#panelBodyMeasures").html();
            obj.dimensions = $("#panelBodyDimensions").html();
            obj.rows = $("#panelBodyRows").html();
            obj.columns = $("#panelBodyColumns").html();
            obj.tables = $("#panelTables .panel-body").html();
            env = JSON.stringify(obj);
            $.ajax({ 
                url: "app.php",
                method: "POST",
                data: {SAVE_ENV: env, FILE: fileName},
                success: function(data) {
                    console.log(data);
                    fetchEnvs();
                }
            });
        }
    });
}

function restoreEnv(fileName, callback) {
    console.log("restoreEnv()", fileName);
    $.ajax({
        url: "app.php",
        type: "POST",
        data: {GET_ENV: fileName},
        success: function(data) {
            if (data.indexOf("not found") > -1) {
                bspopup(data);
                if (callback != undefined) callback(data);
                return;
            }
            env = data;
            var obj = JSON.parse(env);
            lastChartData = obj.chartData;
            $("#panelBodyMeasures").html(obj.measures);
            $("#panelBodyDimensions").html(obj.dimensions);
            $("#panelBodyRows").html(obj.rows);
            $("#panelBodyColumns").html(obj.columns);
            $("#panelTables .panel-body").html(obj.tables);
            drawChart(lastChartData.categories, lastChartData.series);
            if (callback != undefined) callback(data);
        }
    });
}

function clearChart() {
    console.log('clearChart()');
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
