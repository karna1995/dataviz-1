<?php 
/**
 * The primary view for K2M Data Visualization
 * 
 */
 
 //phpinfo();
 //exit();
$debug = false;
if (strstr($_SERVER["HTTP_HOST"], "localhost")) {
    $debug = true; 
}

if (count($_POST)>0) {
     //connection request
     $server = $_POST["Server"];
     $database = $_POST["Database"];
     $username = $_POST["Username"];
     $password = $_POST["Password"];
     $port = $_POST["Port"];
     //$dbh = new PDO("mysql:host=" . $server . ";dbname=test", $user, $pass);
     try {
     $dbh = new PDO("mysql:host=" . $server . ";port=" . $port .  ";dbname=" . $database, $username, $password);
     //$dbh = new PDO("mysql:host=" . $server . ";dbname=" . $database, $username, $password);
    }
    catch(PDOException $e) {
        die("Error occurred: " . $e->getMessage());
    }
    catch(Exception $e) {
        die("Error occurred: " . $e->getMessage());
    }
     
     //$sql = $_POST["txtSQL"]; //TODO HANDLE THIS
     if (isset($_POST["SQL"])) {
         //Handle sql
         $sql = $_POST["SQL"];
         $sth = $dbh->prepare($sql);
         $sth->execute();
         $data = $sth->fetchAll();
        exit(json_encode($data));
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
    <script src="js/utils.js"></script>
    <script src="js/app.js"></script>
    <link rel="stylesheet" href="css/bootstrap.min.css">
</head>
<body>
<style>

body {
    padding-top: 20px;
}    

#theChart {
    /*max-height: 300px;*/
    min-height: 250px;
}

.panel {
    margin-bottom: 10px;
}

.panel-body {
    padding: 3px;
}
    
#panelMeasures .panel-body,
#panelColumns .panel-body {
    /*min-height: 40px;*/
}

.panel-heading {
    padding-top:1px;
    padding-bottom:1px;
}
    
#panelTables .panel-body {
    max-height: 200px;
    overflow-y: scroll;
}
    
button.btn,
button.btn.btn-default,
button.btn.btn-success,
button.btn.btn-primary,
button.btn.btn-info,
button.btn.btn-warning,
button.btn.btn-danger {
    /*white-space: normal;*/
    max-width: 250px;
    overflow-x: hidden;

.glyphicon-refresh.spinning {
    animation: spin 1s infinite linear;
    -webkit-animation: spin2 1s infinite linear;
}

@keyframes spin {
    from { transform: scale(1) rotate(0deg); }
    to { transform: scale(1) rotate(360deg); }
}

@-webkit-keyframes spin2 {
    from { -webkit-transform: rotate(0deg); }
    to { -webkit-transform: rotate(360deg); }
} 

}
</style>
<div class="container" style="margin-top: 2px;">
    <div class="row">
        <div class="col-md-4">
            <div id="panelTables" class="panel panel-default">
              <div class="panel-heading">
                <span class="pull-right glyphicon glyphicon-refresh"></span>
                <h3 class="panel-title">Data Sources</h3>
              </div>
              <div class="panel-body">
                <div>
                    <label class="btn btn-xs btn-default">Sales</label><br>
                </div>
              </div>
            </div>            
            <div id="panelDimensions" class="panel panel-default">
              <div class="panel-heading">
                <span class="pull-right glyphicon glyphicon-refresh"></span>
                <h3 class="panel-title">Dimensions</h3>
              </div>
              <div id="panelBodyDimensions" class="panel-body"  ondragover="allowDrop(event)"  ondrop="drop(event)" >
                    <button class="btn btn-xs btn-default">Country</button><br>
                    <button class="btn btn-xs btn-default">Age</button><br>
                    <button class="btn btn-xs btn-default">Date</button><br>
              </div>
            </div>
            <div id="panelMeasures" class="panel panel-default" >
              <div class="panel-heading">
                <h3 class="panel-title">Measures</h3>
              </div>
              <div id="panelBodyMeasures" class="panel-body" ondragover="allowDrop(event)"  ondrop="drop(event)" >
<!--
                    <label class="btn btn-xs btn-default" id="foofoo" ondragstart="drag(event)"  draggable="true">foo</label>
                    <label class="btn btn-xs btn-default" id="foobar" ondragstart="drag(event)"  draggable="true">bar</label>
                    <label class="btn btn-xs btn-default" id="foobaz" ondragstart="drag(event)"  draggable="true">baz</label>
-->
              </div>
            </div>
            
            <div id="panelFilters" class="panel panel-default hidden">
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
        <div class="col-md-8">
                    <div id="panelColumns"  class="panel panel-default">
                      <div class="panel-heading"  >
                        <h3 class="panel-title columns"><span class="glyphicon glyphicon-th">&nbsp;</span>Columns</h3>
                      </div>
                      <div id="panelBodyColumns" class="panel-body" ondragover="allowDrop(event)" ondrop="drop(event)" >
                      </div>
                    </div>
                    <div id="panelRows"  class=" panel panel-default">
                      <div class="panel-heading"  >
                        <h3 class="panel-title rows"><span class="glyphicon glyphicon-th-list">&nbsp;</span>Rows</h3>
                      </div>
                      <div id="panelBodyRows" class="panel-body" ondragover="allowDrop(event)" ondrop="drop(event)" >
                      </div>
                    </div>
            <div class="panel panel-default">
              <div class="panel-heading">
                <h3 class="panel-title">
                    <button data-toggle="modal" onclick="showConnectDialog();" class="btn btn-xs btn-default" title="Settings"><span class="glyphicon glyphicon-cog"></span></button>
                    
                    <span id="mnuChartType" role="presentation" class="dropdown">
                        <a class="btn btn-xs btn-default dropdown-toggle" data-target="" data-toggle="dropdown" href="#" title="Chart Type">
                          <span class="glyphicon glyphicon-stats"></span> <span class="caret"></span>
                        </a>
                        <ul class="dropdown-menu" role="menu">
                                <li><a href="#">Line</a></li>
                                <li><a href="#">Bar</a></li>
                                <li><a href="#">Pie</a></li>
                        </ul>
                  </span>
                    
                    &nbsp;K2M Data Visualizer
                    <button class="hidden pull-right btn btn-sm btn-warning" title="Help"><span class="glyphicon glyphicon-question-sign"></span></button>
                </h3>
              </div>
              <div class="panel-body">
                <div id="theChart">
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
            <label>port: </label><input name="txtPort" id="txtPort" class="form-control" value="3306">
            <label>database: </label><input name="txtDatabase" id="txtDatabase" class="form-control">
            <label>username: </label><input name="txtUsername" id="txtUsername" class="form-control">
            <label>password: </label><input type="password" name="txtPassword" id="txtPassword" class="form-control">
        </p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
        <button type="button" class="btn btn-default" onclick="javascript:doConnect();"><span class="glyphicon glyphicon-refresh"></span> Connect</button>
      </div>
    </div><!-- /.modal-content -->
  </div><!-- /.modal-dialog -->
</div><!-- /.modal -->

<div class="modal fade" id="selectTableDialog" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>
        <h4 class="modal-title">Select Table</h4>
      </div>
      <div class="modal-body" style="max-height:300px; overflow-y:scroll;">
          
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
        <button type="button" class="btn btn-default" onclick="javascript:doSelectTable();"><span class="glyphicon glyphicon-refresh"></span> Connect</button>
      </div>
    </div><!-- /.modal-content -->
  </div><!-- /.modal-dialog -->
</div><!-- /.modal -->

  <span id="genericMenu" role="presentation" class="hidden dropdown">
    <a id="label" class="btn btn-xs btn-info dropdown-toggle" data-toggle="dropdown" href="#">
      Dropdown <span class="caret"></span>
    </a>
    <ul class="dropdown-menu" role="menu">
            <li><a href="#">Dimension</a></li>
            <li class="divider"></li>
            <li><a href="#">Count</a></li>
            <li><a href="#">Sum</a></li>
            <li><a href="#">Min</a></li>
            <li><a href="#">Max</a></li>
            <li><a href="#">Average</a></li>
            <li class="divider"></li>
            <li><a href="#">Remove</a></li>
    </ul>
  </span>
</body>
 </html>
