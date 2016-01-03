# K2M Source Repository

## Feature Roadmap

-JDBC/ODBC connection to MySQL and Postgres
-- connect to one table OR
-- Allow user to type a custom SQL. Before closing the window validate that SQL is correct. If correct, close the Custom SQL window and take user to charting section.

-- Recognise data type for each column either for the table or custom SQL by sampling first 10 rows:
Text values
Date values
Date & Time values
Numerical values

- Save the definition of data types and dimensions/metrics for the connections for future use

- Drag and Drop Functionality for rows, columns and filters
-- Dimensons can only be used for grouping
-- Once metric is dragged onto the column or row reference for the chart, it can be have the following mathematical funcrions: Sum, Average, Max, Min, Count, Count Distinct

- Button to allow user to chose the chart type (Area, Line, Bar, Pie, Data)
-- User can see plain data if they choose Data as chart type. Sort of like the pivot table

- User can choose to display values in tooltip or be visible over the coursor on the chart (this is already built into Highcharts) by dragging that value into a special box titled "Tooltip"

- Button to Pause/Refresh the graph. System should not be querying the data while the user is building the chart. Pause chart while building it to avoid query execution after every change or adjustment. Click to refresh the chart once visualisation has been built.

- Export raw data in CSV
