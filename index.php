<?php 
/**
 * The primary view for K2M Data Visualization
 * 
 */
 ?>
 <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>K2M Data Visualization</title>
    <script src="js/jquery.min.js"></script>
    <script src="js/bootstrap.min.js"></script>
    <script src="js/highcharts.js"></script>
    <script src="js/app.js"></script>
    <link rel="stylesheet" href="css/bootstrap.min.css">
</head>
<body>
<div class="container">
    <br>
    <div class="row">
        <div class="col-md-2">
            <div class="panel panel-default">
              <div class="panel-heading">
                <h3 class="panel-title">Tables</h3>
              </div>
              <div class="panel-body">
                <div>
                    <label class="label label-info">Sales</label><br>
                    <label class="label label-info">Orders</label><br>
                </div>
              </div>
            </div>            
            <div class="panel panel-default">
              <div class="panel-heading">
                <h3 class="panel-title">Dimensions</h3>
              </div>
              <div class="panel-body">
                <div>
                    <span class="badge glyphicon glyphicon-circle-arrow-up"> </span><label class="label label-primary">Country</label><br>
                    <span class="badge glyphicon glyphicon-circle-arrow-up"> </span><label class="label label-primary">Age</label><br>
                    <span class="badge glyphicon glyphicon-circle-arrow-up"> </span><label class="label label-primary">Date</label><br>
                </div>
              </div>
            </div>
            <div class="panel panel-default">
              <div class="panel-heading">
                <h3 class="panel-title">Measures</h3>
              </div>
              <div class="panel-body">
                <div>
                    <span class="badge glyphicon glyphicon-circle-arrow-up"> </span><label class="label label-success">id</label><br>
                    <span class="badge glyphicon glyphicon-circle-arrow-up"> </span><label class="label label-success">price</label><br>
                    <span class="badge glyphicon glyphicon-circle-arrow-up"> </span><label class="label label-success">sales</label><br>
                </div>
              </div>
            </div>
            <div class="panel panel-default">
              <div class="panel-heading">
                <h3 class="panel-title">Filters</h3>
              </div>
              <div class="panel-body">
                <div>
                    <span class="badge glyphicon glyphicon-circle-arrow-up"> </span><label class="label label-success">x >= 10</label><br>
                </div>
              </div>
            </div>
        </div>
        <div class="col-md-10">
            <div class="panel panel-warning">
              <div class="panel-heading">
                <h3 class="panel-title">
                    <button class="btn btn-sm btn-warning" title="Settings"><span class="glyphicon glyphicon-cog"></span></button> K2M Data Visualization
                    <button class="pull-right btn btn-sm btn-warning" title="Refresh"><span class="glyphicon glyphicon-refresh"></span></button>
                </h3>
              </div>
              <div class="panel-body">
                <div id="thechart">
                </div>
              </div>
            </div>
        </div>
    </div>
</div>
</body>
 </html>
