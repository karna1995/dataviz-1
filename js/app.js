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
        Database: $("#txtDatabase").val(),
        Username: $("#txtUsername").val(),
        Password: $("#txtPassword").val(),
    };
    $.post("", conn ,function(data){
        if (data.indexOf("Error occurred") >= 0) {
            alert("Error occurred. Please check the connection parameters.");
            return;
        }
        
        var divtables = "<div>";
        var divdimensions = "<div>";
        var divmeasures = "<div>";
        tables = {};
        
        data = JSON.parse(data);
        for (var i=0;i<data.length;i++) {
            var row = data[i];
            //console.log(row.table_name + "." + row.column_name);
            if (!(row.table_name in tables)) {
                tables[row.table_name] = {};
                var types = ['primary', 'info', 'warning', 'success', 'danger'];
                var rand = Math.floor(Math.random() * types.length);
                divtables += '<button id=table' + row.table_name +  ' class="btn btn-xs btn-' + types[rand] +  ' table-button">' +  row.table_name + '</button><br>';
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
        $("#connectDialog").modal('hide');
        
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
                    divdimensions += '<button class="btn btn-xs btn-primary">' + tables[tname].dimensions[i] + '</button><br>';
                }
                divdimensions += "</div>";
                divmeasures += "</div>";
                $("#panelDimensions .panel-body").html(divdimensions)
                $("#panelMeasures .panel-body").html(divmeasures)
                
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
                        var sql = "";
                        for (var i=0;i<currentMeasures.length;i++) {
                            sql += (sql.length==0 ? "" : ",") + "count(" +  currentMeasures[i] + ")";
                        }
                        sql = "SELECT " + currentDimension + "," + sql + " FROM " + currentTable + " GROUP BY " + currentDimension;
                        console.log(sql);
                        $.post("",{
                            Server:conn.Server,
                            Database:conn.Database,
                            Username:conn.Username,
                            Password:conn.Password,
                            SQL:sql
                        },function(data){
                            //~ var categories = []; //selected dimension
                            //~ categories.push("India");
                            //~ categories.push("China");
                            //~ categories.push("Germany");
                            
                            //~ var series = []; //selected measures
                            //~ series.push({name:'avg(price)',data:[1,3,3]});
                            //~ series.push({name:'sum(sales)',data:[25,19,31]});
                            
                            var categories = []; //data regarding the current dimension
                            var series = []; //data regarding the current measures
                            for(var j=0;j<currentMeasures.length;j++) {
                                series.push({name:"count(" + currentMeasures[j] + ")",data:[]});
                            }
                            //console.log(data);
                            data = JSON.parse(data);
                            for(var i=0;i<data.length;i++) {
                                categories.push(data[i][0]);
                                for(var j=0;j<currentMeasures.length;j++) {
                                    var val = Number(data[i][j+1]);
                                    series[j].data.push(val);
                                }
                            }
                            //clearChart();
                            drawChart(categories, series);
                            
                            window.series = series;
                            window.categories = categories;
                        });
                    }
                    else {
                        clearChart();
                    }
                });
            });
        });
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
