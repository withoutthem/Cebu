--- This file is used to run SQL commands in the database console.

SELECT username FROM all_users WHERE username = 'CBUI_WAS' ORDER BY username;

-- 현재 내 스키마에 있는 테이블 목록 보기
SELECT table_name FROM user_tables ORDER BY table_name;

