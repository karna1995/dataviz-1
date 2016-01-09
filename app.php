<?php 
/**
 * Backend business logic for Dataviz app.
 * 
 * @author Prahlad Yeri (prahladyeri@yahoo.com)
 */
$debug = false;
if (strstr($_SERVER["HTTP_HOST"], "localhost")) {
    $debug = true; 
}

if (count($_POST)>0) {
    if (isset($_POST["FETCH_ENVS"])) {
        $r = array();
        foreach(glob("*.dviz") as $entry) {
            array_push($r, substr($entry, 0, -5));
        }
        exit(json_encode($r));
    }
    else if (isset($_POST["GET_ENV"])) {
        $fname = $_POST["GET_ENV"] . ".dviz";
        if (file_exists($fname)) {
            $fp = fopen($fname, "r");
            $json = fread($fp, filesize($fname));
            fclose($fp);
            exit($json);
        } else {
            exit("File not found");
        }
    }
    else if (isset($_POST["SAVE_ENV"])) {
        $fname = $_POST["FILE"] . ".dviz";
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
        $dbh = new PDO("mysql:host=" . $server . ";port=" . $port .  ";dbname=" . $database, 
            $username, $password, array(
            PDO::ATTR_TIMEOUT => "5",
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ));
        //$dbh->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);         
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
        $arr = $sth->errorInfo();
        //$code = substr($sth->errorCode(), 0, 2);
        $code = substr($arr[0], 0, 2);
        if ($code=="00" || $code=="01") {
            $data = $sth->fetchAll();
            exit(json_encode($data));
        }
        else {
            exit("Error code: " . $arr[0] . "-" . $arr[1] . "-" . $arr[2]);
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
