<?php 
/**
 * The primary view for K2M Data Visualization
 * 
 */
 
 //phpinfo();
 //exit();
 
 if (count($_POST)>0) {
     //connection request
     $server = $_POST["txtServer"];
     $database = $_POST["txtDatabase"];
     $username = $_POST["txtUsername"];
     $password = $_POST["txtPassword"];
     //$dbh = new PDO("mysql:host=" . $server . ";dbname=test", $user, $pass);
     try {
     $dbh = new PDO("mysql:host=" . $server . ";dbname=" . $database, $username, $password);
    }
    catch(PDOException $e) {
        die("Error occurred");
    }
    catch(Exception $e) {
        die("Error occurred");
    }
     
     //$sql = $_POST["txtSQL"]; //TODO HANDLE THIS
     if (isset($_POST["txtSQL"])) {
         //Handle sql
    }
     else {
         //output all tables and columns
         $r = array();
         $sql = "select table_schema, table_name, column_name, data_type,column_type from information_schema.columns where table_schema not in ('information_schema', 'mysql')";
         $sth = $dbh->prepare($sql);
         $sth->execute();
         $data = $sth->fetchAll();
         foreach($data as $item) {
             array_push($r, array(
             "table_schema"=>$item["table_schema"],
             "table_name"=>$item["table_name"],
             "column_name"=>$item["column_name"],
             "data_type"=>$item["data_type"],
             ));
            
         }
        exit(json_encode($r));
    }
}
 //     RETURN A JSON OBJECT WITH TABLES
//      exit('json');
 // ELSE
 //     CONTINUE AS BELOW
 //ENDIF
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
            <div id="panelTables" class="panel panel-default">
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
            <div id="panelDimensions" class="panel panel-default">
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
            <div id="panelMeasures" class="panel panel-default">
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
            <div id="panelFilters" class="panel panel-default">
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
                    <button data-toggle="modal" data-target="#connectDialog" class="btn btn-sm btn-warning" title="Settings"><span class="glyphicon glyphicon-cog"></span></button> K2M Data Visualization
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

<div class="modal fade" id="connectDialog" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>
        <h4 class="modal-title">Connect</h4>
      </div>
      <div class="modal-body">
        <p>
            <label>mysql server: </label><input name="txtServer" id="txtServer" class="form-control">
            <label>database: </label><input name="txtDatabase" id="txtDatabase" class="form-control">
            <label>username: </label><input name="txtUsername" id="txtUsername" class="form-control">
            <label>password: </label><input name="txtPassword" id="txtPassword" class="form-control">
        </p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
        <button type="button" class="btn btn-primary" onclick="javascript:doconnect();">Connect</button>
      </div>
    </div><!-- /.modal-content -->
  </div><!-- /.modal-dialog -->
</div><!-- /.modal -->
</body>
 </html>
