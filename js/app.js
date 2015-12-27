$(function () {
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
});
