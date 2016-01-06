<?php 
/**
 * The primary view for Dataviz.
 * 
 */
$debug = false;
if (strstr($_SERVER["HTTP_HOST"], "localhost")) {
    $debug = true; 
}

if (count($_POST)>0) {
    if (isset($_POST["GET_ENV"])) {
        $fname = "env.json";
        if (file_exists($fname)) {
            $fp = fopen($fname, "r");
            $json = fread($fp, filesize($fname));
            fclose($fp);
            exit($json);
        } else {
            exit("File not found");
        }
    } else if (isset($_POST["SAVE_ENV"])) {
        $fname = "env.json";
        $json = $_POST["SAVE_ENV"];
        $fp = fopen($fname, "w");
        fwrite($fp,$json);
        fclose($fp);
        exit("success");
    }

    //connection request
    $server = $_POST["Server"];
    $database = $_POST["Database"];
    $username = $_POST["Username"];
    $password = $_POST["Password"];
    $port = $_POST["Port"];
    try {
        $dbh = new PDO("mysql:host=" . $server . ";port=" . $port .  ";dbname=" . $database, $username, $password);
    } catch(PDOException $e) {
        die("Error occurred: " . $e->getMessage());
    } catch(Exception $e) {
        die("Error occurred: " . $e->getMessage());
    }
    
    if (isset($_POST["CSV"])) {
        //prepare the csv
        $fp = fopen("output.csv","w");
        $r = array();
        $sql = $_POST["SQL"];
        $sth = $dbh->prepare($sql);
        $sth->execute();
        $data = $sth->fetchAll();
        //remove number indices
        $ndata = [];
        foreach ($data as $item) {
            $tarr = array();
            foreach ($item as $key => $value) {
                if (!is_int($key)) {
                    //unset($item[$key]);
                    array_push($tarr, $value);
                    //var_dump($value);
                }
            }
            fputcsv($fp, $tarr);
        }
        //now build the csv
        fclose($fp);
        exit("success");
    } else if (isset($_POST["SQL"])) {
        //Handle sql
        $sql = $_POST["SQL"];
        $sth = $dbh->prepare($sql);
        $sth->execute();
        $code = substr($sth->errorCode(), 0, 2);
        if ($code=="00" || $code=="01") {
            $data = $sth->fetchAll();
            exit(json_encode($data));
        }
        else {
            exit("Error code: " . $sth->errorCode());
        }
    } else {
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
 ?>
 <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Dataviz</title>
    <script src="js/jquery.min.js"></script>
    <script src="js/bootstrap.min.js"></script>
    <script src="js/highcharts.js"></script>
    <script src="js/utils.js"></script>
    <script src="js/app.js"></script>
    <link rel="stylesheet" href="css/bootstrap.min.css">
</head>
<body>
<style>
    
/*Bootstrap overrides*/
.dropdown-menu > li > a:focus, .dropdown-menu > li > a:hover {
    background-color: #4078C0;
}
    
/*Bootstrap submenu override starts*/
    .dropdown-submenu {
        position:relative;
    }
    
    .dropdown-submenu>.dropdown-menu {
        top:0;
        left:100%;
        margin-top:-6px;
        margin-left:-1px;
        -webkit-border-radius:0 6px 6px 6px;
        -moz-border-radius:0 6px 6px 6px;
        border-radius:0 6px 6px 6px;
    }
    .dropdown-submenu:hover>.dropdown-menu {
        display:block;
    }
    .dropdown-submenu>a:after {
        display:block;
        content:" ";
        float:right;
        width:0;
        height:0;
        border-color:transparent;
        border-style:solid;
        border-width:5px 0 5px 5px;
        border-left-color:#cccccc;
        margin-top:5px;
        margin-right:-10px;
    }
    .dropdown-submenu:hover>a:after {
        border-left-color:#ffffff;
    }
    .dropdown-submenu.pull-left {
        float:none;
    }
    .dropdown-submenu.pull-left>.dropdown-menu {
        left:-100%;
        margin-left:10px;
        -webkit-border-radius:6px 0 6px 6px;
        -moz-border-radius:6px 0 6px 6px;
        border-radius:6px 0 6px 6px;
    }
/*Bootstrap submenu override ends*/
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
#panelDimensions .panel-body {
    min-height: 20px;
}

#panelMeasures .measure, 
#panelDimensions .dimension {
    display:block;
    margin: 1px 1px;
}


.panel-heading {
    padding-top:5px;
    padding-bottom:7px;
}

#panelChart .panel-heading {
    padding-top: 5px;
    padding-bottom: 7px;
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
                <h3 class="panel-title"><button data-toggle="modal" onclick="showConnectDialog();" class="pull-right btn btn-xs btn-default" title="Settings"><span class="glyphicon glyphicon-cog"></span></button> Data Sources</h3>
              </div>
              <div class="panel-body">
                <div>
                    <label class="btn btn-xs btn-default">Sales</label><br>
                </div>
              </div>
            </div>            
            <div id="panelDimensions" class="panel panel-default">
              <div class="panel-heading">
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
            <div id="panelChart" class="panel panel-default">
              <div class="panel-heading">
                <h3 class="panel-title">
                    <span>Dataviz</span>
                    <button data-toggle="modal" onclick="showConnectDialog();" class="hidden pull-right btn btn-xs btn-default" title="Settings"><span class="glyphicon glyphicon-cog"></span></button>
                    <span id="mnuChartType" role="presentation" class="dropdown pull-right">
                        <a class="btn btn-xs btn-default dropdown-toggle" data-target="" data-toggle="dropdown" href="#" title="Chart Type">
                          <span class="glyphicon glyphicon-stats"></span> <span class="caret"></span>
                        </a>
                        <ul class="dropdown-menu" role="menu">
                                <li><a onclick="currentChartType='line';drawTheChart();" href="#">Line</a></li>
                                <li><a onclick="currentChartType='bar';drawTheChart();" href="#">Bar</a></li>
                                <li><a onclick="currentChartType='column';drawTheChart();" href="#">Column</a></li>
                                <li><a onclick="currentChartType='pie';drawTheChart();" href="#">Pie</a></li>
                                <li><a onclick="currentChartType='area';drawTheChart();" href="#">Area</a></li>
                                <li class='hidden'><a onclick="currentChartType='data';drawTheChart();" href="#">Data</a></li>
                        </ul>
                  </span>
                  <button title="SQL" onclick="showSQLDialog();" class="hidden btn btn-xs btn-default pull-right">SQL</button>
                  <button title="Export to CSV" onclick="exportToCSV();" class="btn btn-xs btn-default pull-right">CSV</button>
                  <button title="Clear Environment" onclick="clearEnv();" class="btn btn-xs btn-default pull-right">Clear</button>
                  <button title="Save Environment" onclick="saveEnv();" class="btn btn-xs btn-default pull-right">Save</button>
                  <button title="Restore Environment" onclick="restoreEnv();" class="btn btn-xs btn-default pull-right">Restore</button>
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
            <!-- Nav tabs -->
            <ul class="nav nav-tabs" role="tablist">
                <li role="presentation" class="active"><a href="#tabTables" role="tab" data-toggle="tab">Tables</a></li>
                <li class="" role="presentation"><a href="#tabCustomSQL" role="tab" data-toggle="tab">Custom SQL</a></li>
            </ul>
            <!-- Tab panes -->
            <div class="tab-content">
                <div role="tabpanel" class="tab-pane active" id="tabTables"></div>
                <div role="tabpanel" class="tab-pane" id="tabCustomSQL">
                    <textarea id="txtCustomSQL" rows="9" cols="70">SELECT * FROM;</textarea>
                    <button onclick="doTestCustomSQL();" class="btn btn-default">Test</button>
                </div>
            </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
        <button type="button" class="btn btn-default" onclick="javascript:doSelectTable();"><span class="glyphicon glyphicon-refresh"></span> Connect</button>
      </div>
    </div><!-- /.modal-content -->
  </div><!-- /.modal-dialog -->
</div><!-- /.modal -->

<div class="modal fade" id="sqlDialog" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>
        <h4 class="modal-title">SQL</h4>
      </div>
      <div class="modal-body" style="">
          <textarea id="txtSQL" rows="10" cols="70" readonly="readonly"></textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
      </div>
    </div><!-- /.modal-content -->
  </div><!-- /.modal-dialog -->
</div><!-- /.modal -->

  <span id="genericMenu" role="presentation" class="hidden dropdown" >
    <a id="label" class="btn btn-xs btn-info dropdown-toggle" data-toggle="dropdown" href="#" >
      Dropdown <span class="caret"></span>
    </a>
    <ul class="dropdown-menu" role="menu">
        <li><a href="#">Dimension</a></li>
        <li class="menu-item dropdown dropdown-submenu">
             <a href="#" class="dropdown-toggle" data-toggle="dropdown">Measures </a>
              <ul class="dropdown-menu">
                    <li class="menu-item"><a href="#">Sum</a></li>
                    <li class="menu-item"><a href="#">Count</a></li>
                    <li class="menu-item"><a href="#">Distinct Count</a></li>
                    <li class="menu-item"><a href="#">Sum</a></li>
                    <li class="menu-item"><a href="#">Min</a></li>
                    <li class="menu-item"><a href="#">Max</a></li>
                    <li class="menu-item"><a href="#">Average</a></li>
              </ul>
        </li>
        <li><a href="#">Remove</a></li>
    </ul>
  </span>
</body>
 </html>
