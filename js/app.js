/*
 * js module for controlling k2m app.
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
var numTypes = ["float", "double", "decimal", "int", "smallint",
    "tinyint", "mediumint", "bigint"];

function exportToCSV() {
    console.log("exportToCSV()");
    if (lastSQL=="") {
        alert("No executed SQL statement found.");
        return;
    }
   $.ajax({
        url: "",
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
        if (ev.target.id == "teaser" || ev.target.id=="teaserSmall") {
            console.log("if teaser", ev.target.parentElement, ev.target.parentElement.id);
            theParent = ev.target.parentElement;
        } else if (ev.target.id=="panelBodyRows" || ev.target.id=="panelBodyColumns") {
            theParent = ev.target;
        } else if (ev.target.id=="label") {
            console.log("if label");
            theParent = ev.target.parentElement.parentElement;
        } else if (($(ev.target).hasClass("measure") ||  $(ev.target).attr("id")=="panelBodyMeasures") 
            && control.hasClass("dimension")) {
            //dimension dragged into measure
            theParent = $("#panelBodyMeasures")[0];
            control.removeClass("dimension");
            control.addClass("measure");
            control.appendTo($(theParent));
            return;
        } else if (($(ev.target).hasClass("dimension") || $(ev.target).attr("id")=="panelBodyDimensions" )
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
    //$(theParent).append($(theLabel));
    theField.find("li a").click(function(){
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
        //console.log();
    });
    $(theParent).append(theField);
    $(theParent).find("#teaser").remove();
    
    currentMeasures = [];
    currentDimensions = [];
    drawTheChart();
    

    if  (false) { //(control.hasClass("measure")) {
        var theParent;
        var theText = $(document.getElementById(data)).text();
        if (ev.target.id == "teaser" || ev.target.id=="teaserSmall") {
            theParent = $("#panelColumns .panel-body")[0];
        } else {
            theParent = ev.target;
        }
        
        console.log(".drop(). The target is: ", theParent.id);
        theParent.appendChild(document.getElementById(data));
        if ($("#panelColumns .measure").length>0) {
            console.log("avail measures length", $("#panelColumns .measure").length);
            if ($("#panelColumns #teaser").length>0) $("#panelColumns #teaser").remove();
        } else {
            console.log("avail measures length", $("#panelColumns .measure").length);
            $("#panelColumns .panel-body").html(getHTMLTeaser());
        }
        currentMeasures = [];
         //loop thru all labels inside #panelColumns
        $("#panelColumns .measure").each(function(){
            var theText = $(this).text();
            currentMeasures.push(theText);
        });
        //add each to currentMeasures
        drawTheChart();
    }

}

function allowDrop(ev) {
    ev.preventDefault();
}

$(document).ready(function() 
{
    clearChart();
    conn = localStorage.getItem("conn");
    if (conn==null) {
        conn={};
        //$("#connectDialog").modal('show');
        showConnectDialog();
    } else {
        conn = JSON.parse(conn);
        connect();
    }
});

function doConnect() {
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
    $("#connectDialog .glyphicon-refresh").addClass("spinning");
    $.ajax({
        url: "",
        type: "POST",
        data: conn ,
        error: function(response) {
            $("#connectDialog .glyphicon-refresh").removeClass("spinning");
            $("#connectDialog").modal('hide');
            //Handle error
        },
        success: function(data) {
            $("#connectDialog .glyphicon-refresh").removeClass("spinning");
            $("#connectDialog").modal('hide');
            if (data.indexOf("Error occurred") >= 0) {
                alert(data);
                //alert("Error occurred. Please check the connection parameters.");
                return;
            }
            showTablesDialog(data);
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

function doTestCustomSQL() {
    var data = $.extend({}, conn);
    data.SQL = $("#txtCustomSQL").val();
    console.log("SQL", data.SQL);
    $.ajax({
        url: "",
        method: "POST",
        data: data,
        success: function(data){
            console.log(data);
            if (data.indexOf("Error code:") == -1) {
                result = JSON.parse(data);
                alert(result.length + " records returned");
            } else {
                alert(data);
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
        $("#selectTableDialog").modal('hide');
        buildTheTables({
            data: newdata
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
        sql = "SELECT " + selClause + " FROM " + currentTable + " GROUP BY " + groupbyClause;
        console.log(sql);
        $("#panelDimensions .glyphicon-refresh").addClass("spinning");
        $("#panelMeasures .glyphicon-refresh").addClass("spinning");
        $.ajax({
            url: "",
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
                window.data = data;
                window.series = series;
                window.categories = categories;
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
    options.title = {text: currentDimensions[0] + " wise chart"};
    options.xAxis = {categories: categories};
    options.yAxis = {title: {
                text: 'Units'
            }};
    options.series = series; //JSON.parse(series); //[{name: series[0].name, data: series[0]['data']}];
    $('#theChart').highcharts(options);
};

function clearChart() {
    console.log('clearChart()');
    $('#theChart').highcharts({
    chart: {
        type: 'line',//'bar'
    },
    title: {
        text: 'Data Visualizer'
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
