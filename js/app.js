var isConnected = true;
var tables = {};

//TODO: Check using cookies/localObject whether we already have a connection object

$(document).ready(function() 
{
    if (isConnected) {
        drawChart();
    }
});

function doconnect() {
    console.log("doconnect()");
    indata = {
        "txtServer": $("#txtServer").val(),
        txtDatabase: $("#txtDatabase").val(),
        txtUsername: $("#txtUsername").val(),
        txtPassword: $("#txtPassword").val(),
    };
    $.post("", indata ,function(data){
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
                divtables += '<button id=table' + row.table_name +  ' class="btn btn-sm btn-' + types[rand] +  ' table-button">' +  row.table_name + '</button><br>';
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
                console.log(".click ", event.data.id, tables[tname].measures);
                //generate html for dimensions and measures
                var divdimensions = "<div>";
                var divmeasures = "<div>";
                for(var i=0;i<tables[tname].measures.length;i++) {
                    console.log("measure:",tables[tname].measures[i]);
                    divmeasures += '<label class="label label-success">' + tables[tname].measures[i] + '</label><br>';
                }
                for(var i=0;i<tables[tname].dimensions.length;i++) {
                    console.log("dimensions:",tables[tname].dimensions[i]);
                    divdimensions += '<label class="label label-primary">' + tables[tname].dimensions[i] + '</label><br>';
                }
                divdimensions += "</div>";
                divmeasures += "</div>";
                $("#panelDimensions .panel-body").html(divdimensions)
                $("#panelMeasures .panel-body").html(divmeasures)
            });
        });
    });
}


function drawChart() {
    var categories = []; //selected dimension
    categories.push("India");
    categories.push("China");
    categories.push("Germany");
    
    var series = []; //selected measures
    series.push({name:'avg(price)',data:[1,3,3]});
    series.push({name:'sum(sales)',data:[25,19,31]});
    
    $('#thechart').highcharts({
        chart: {
            type: 'line',//'bar'
        },
        title: {
            text: 'Data Visualization'
        },
        xAxis: {
            categories: categories
        },
        yAxis: {
            title: {
                text: 'Unit of Measurement'
            }
        },
        series: series
    });
};
