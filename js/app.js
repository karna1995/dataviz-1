var isConnected = false;
var conn = {}; //connection information
var tables = {};
var currentTable = "";
var currentDimension = "";
var currentMeasures = [];


$(document).ready(function() 
{
    //TODO: Check using cookies/localObject whether we already have a connection object
    if (isConnected) {
        drawChart();
    }
    else {
        clearChart();
        $("#connectDialog").modal('show');
    }
});

function doconnect() {
    console.log("doconnect()");
    conn = {
        Server: $("#txtServer").val(),
        Port: $("#txtPort").val(),
        Database: $("#txtDatabase").val(),
        Username: $("#txtUsername").val(),
        Password: $("#txtPassword").val(),
    };
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
            selectTheTables(data);
        }
    });
}

function selectTheTables(data) {
    //console.log(data);
    data = JSON.parse(data);
    divBody = "<div class='input-group'>";
    for (var i=0;i<data.length;i++) {
        var row = data[i];
        var tname = row["table_schema"] + "."  + row["table_name"];
        if (divBody.indexOf(tname) ==-1 ) {
            divBody += "<label class='label label-default'>" + tname +  "<input name='grpSelectTable' type='radio' value='" + tname + "' id='"  + tname +  "' " + ((i==0) ? "checked" : "") + "></label><br>";
        }
    }
    divBody += "</div>"; //class='input-group'>
    $("#selectTableDialog .modal-body").html(divBody);
    $("#selectTableDialog").modal('show');
    window.data = data;
}

function doSelectTable() {
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
    buildTheTables(newdata);
}

function buildTheTables(data) {
    var divtables = "<div>";
    var divdimensions = "<div>";
    var divmeasures = "<div>";
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
        if (row.data_type=='int' || row.data_type=='float' || row.data_type=='double') {
            //console.log('number field found ', row.column_name, row.data_type);
            tables[row.table_name]['measures'].push(row.column_name);
            //divmeasures += '<label id=measures' + row.column_name +  ' class="label label-success">' +  row.column_name + '</label><br>';
        }
        else {
            //console.log('non number field found ', row.column_name, row.column_type);
            tables[row.table_name]['dimensions'].push(row.column_name);
        }
    }
    
    divtables += "</div>";
    divdimensions += "</div>";
    divmeasures += "</div>";
    $("#panelTables .panel-body").html(divtables)
    $("#panelDimensions .panel-body").html(divdimensions)
    $("#panelMeasures .panel-body").html(divmeasures)
    
    window.tables = tables;
    
    //attach events to .table-button
    $(".table-button").each(function(index, obj){
        $(this).on("click", {id: $(this).attr("id")}, function(event){
            var tname = event.data.id.substring(5);
            currentTable = tables[tname].schema + "." +  tname;
            currentDimension = "";
            currentMeasures = [];
            console.log(".click ", event.data.id, tables[tname].measures);
            //generate html for dimensions and measures
            var divdimensions = "<div>";
            var divmeasures = "<div>";
            for(var i=0;i<tables[tname].measures.length;i++) {
                console.log("measure:",tables[tname].measures[i]);
                divmeasures += '<label class="label label-default measure"><input type="checkbox" id="' + tables[tname].measures[i] +  '">' + tables[tname].measures[i] + '</label><br>';
            }
            if (tables[tname].dimensions.length >0) {
                currentDimension = tables[tname].dimensions[0];
            }
            for(var i=0;i<tables[tname].dimensions.length;i++) {
                console.log("dimensions:",tables[tname].dimensions[i]);
                divdimensions += '<button class="btn btn-xs btn-default dimension">' + tables[tname].dimensions[i] + '</button><br>';
            }
            divdimensions += "</div>";
            divmeasures += "</div>";
            $("#panelDimensions .panel-body").html(divdimensions)
            $("#panelMeasures .panel-body").html(divmeasures)
            
            $("button.dimension").on('click', function(){
                currentDimension = $(this).text();
                drawTheChart();
            });
            
            $("#panelMeasures .measure input[type='checkbox']").click(function(){
                //console.log($(this).attr("id"), $(this).is(":checked"));
                var measure = $(this).attr("id");
                if ($(this).is(":checked")) {
                    currentMeasures.push(measure);
                }
                else {
                    if (currentMeasures.indexOf(measure)>-1) {
                        currentMeasures.remove(measure);
                    }
                }
                if (currentMeasures.length>0) {
                    drawTheChart();
                }
                else {
                    clearChart();
                }
            });
        });
    });
    
    $(".table-button:first").click(); //lets auto click the first table in the box.
}

function drawTheChart() {
    if (currentMeasures.length==0) return;
    var sql = "";
    for (var i=0;i<currentMeasures.length;i++) {
        sql += (sql.length==0 ? "" : ",") + "count(" +  currentMeasures[i] + ")";
    }
    sql = "SELECT " + currentDimension + "," + sql + " FROM " + currentTable + " GROUP BY " + currentDimension;
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
            $("#panelDimensions .glyphicon-refresh").removeClass("spinning");
            $("#panelMeasures .glyphicon-refresh").removeClass("spinning");
            var categories = []; //data regarding the current dimension
            var series = []; //data regarding the current measures
            for(var j=0;j<currentMeasures.length;j++) {
                series.push({name:"count(" + currentMeasures[j] + ")",data:[]});
            }
            data = JSON.parse(data);
            for(var i=0;i<data.length;i++) {
                categories.push(data[i][0]);
                for(var j=0;j<currentMeasures.length;j++) {
                    var val = Number(data[i][j+1]);
                    series[j].data.push(val);
                }
            }
            drawChart(categories, series);
        },
        error: function(response) {
            $("#panelDimensions .glyphicon-refresh").removeClass("spinning");
            $("#panelMeasures .glyphicon-refresh").removeClass("spinning");
            //handle error
        }
        });
}

function drawChart(categories, series) {
    var options = {};
    options.chart = {type: 'line'}; //'bar'
    options.title = {text: currentDimension + " wise chart"};
    options.xAxis = {categories: categories};
    options.yAxis = {title: {
                text: 'Unit of Measurement'
            }};
    options.series = series; //JSON.parse(series); //[{name: series[0].name, data: series[0]['data']}];
    $('#thechart').highcharts(options);
};

function clearChart() {
    console.log('clearChart()');
    $('#thechart').highcharts({
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
            text: 'Unit of Measurement'
        }
    },
    series: [{name:"dummy-measure", data: [0,0,0]}]
});
}
