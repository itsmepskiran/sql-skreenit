-- Check for any triggers on the companies table
SHOW TRIGGERS WHERE `Table` = 'companies';

-- Check for any stored procedures that might affect companies
SHOW PROCEDURE STATUS WHERE Db = 'u432595843_sql_skreenit';

-- Check database engine details
SELECT ENGINE, TABLE_COMMENT, TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'u432595843_sql_skreenit' AND TABLE_NAME = 'companies';

-- Check if there are any special modes or restrictions
SELECT @@sql_mode, @@foreign_key_checks;
