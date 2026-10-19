<?php
// Copy this to config.php and set your local MySQL credentials.
return [
  'db_host' => getenv('TRIP_DB_HOST') ?: '127.0.0.1',
  'db_port' => getenv('TRIP_DB_PORT') ?: '3306',
  'db_name' => getenv('TRIP_DB_NAME') ?: 'trip_companion',
  'db_user' => getenv('TRIP_DB_USER') ?: 'root',
  'db_password' => getenv('TRIP_DB_PASSWORD') ?: '',
];
